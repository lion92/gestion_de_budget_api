import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/entity/user.entity';
import { Envelope } from '../src/entity/envelope.entity';
import { Transaction } from '../src/entity/transaction.entity';
import { Repository } from 'typeorm';

describe('Budget API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let envelopeRepository: Repository<Envelope>;
  let transactionRepository: Repository<Transaction>;
  let authToken: string;
  let testUser: User;
  let testEnvelope: Envelope;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    envelopeRepository = moduleFixture.get<Repository<Envelope>>(getRepositoryToken(Envelope));
    transactionRepository = moduleFixture.get<Repository<Transaction>>(getRepositoryToken(Transaction));

    await app.init();
  });

  beforeEach(async () => {
    await transactionRepository.clear();
    await envelopeRepository.clear();
    await userRepository.clear();

    const userData = {
      email: 'test@example.com',
      password: 'password123',
      nom: 'Test',
      prenom: 'User',
    };

    const signupResponse = await request(app.getHttpServer())
      .post('/connection/signup')
      .send(userData)
      .expect(201);

    testUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    testUser.isEmailVerified = true;
    await userRepository.save(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/connection/login')
      .send({
        email: userData.email,
        password: userData.password,
      })
      .expect(200);

    authToken = loginResponse.body.jwt;

    const envelopeData = {
      name: 'Test Envelope',
      amount: 1000,
      userId: testUser.id,
      month: 1,
      year: 2024,
      icone: '💰',
    };

    const envelopeResponse = await request(app.getHttpServer())
      .post('/envelopes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(envelopeData)
      .expect(201);

    testEnvelope = envelopeResponse.body;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/connection (Authentication)', () => {
    describe('POST /connection/signup', () => {
      it('should create a new user', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'password123',
          nom: 'New',
          prenom: 'User',
        };

        return request(app.getHttpServer())
          .post('/connection/signup')
          .send(userData)
          .expect(201);
      });

      it('should not create user with existing email', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'password123',
          nom: 'Duplicate',
          prenom: 'User',
        };

        return request(app.getHttpServer())
          .post('/connection/signup')
          .send(userData)
          .expect(400);
      });
    });

    describe('POST /connection/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/connection/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(200);

        expect(response.body).toHaveProperty('jwt');
        expect(response.body).toHaveProperty('email', 'test@example.com');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/connection/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
          .expect(200);

        expect(response.body.success).toBe(false);
        expect(response.body.status).toBe(401);
      });
    });
  });

  describe('/envelopes (Budget Envelopes)', () => {
    describe('POST /envelopes', () => {
      it('should create a new envelope', async () => {
        const envelopeData = {
          name: 'Groceries',
          amount: 500,
          userId: testUser.id,
          month: 2,
          year: 2024,
          icone: '🛒',
        };

        const response = await request(app.getHttpServer())
          .post('/envelopes')
          .set('Authorization', `Bearer ${authToken}`)
          .send(envelopeData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Groceries');
        expect(response.body.amount).toBe(500);
      });

      it('should reject unauthorized requests', async () => {
        const envelopeData = {
          name: 'Unauthorized',
          amount: 100,
          userId: testUser.id,
          month: 1,
          year: 2024,
        };

        return request(app.getHttpServer())
          .post('/envelopes')
          .send(envelopeData)
          .expect(401);
      });
    });

    describe('GET /envelopes/:userId/:month/:year', () => {
      it('should get user envelopes for specific month/year', async () => {
        const response = await request(app.getHttpServer())
          .get(`/envelopes/${testUser.id}/1/2024`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].name).toBe('Test Envelope');
      });
    });

    describe('PUT /envelopes/:id', () => {
      it('should update envelope', async () => {
        const updateData = {
          name: 'Updated Envelope',
          amount: 1500,
        };

        const response = await request(app.getHttpServer())
          .put(`/envelopes/${testEnvelope.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.name).toBe('Updated Envelope');
        expect(response.body.amount).toBe(1500);
      });
    });

    describe('DELETE /envelopes/:id', () => {
      it('should delete envelope', async () => {
        return request(app.getHttpServer())
          .delete(`/envelopes/${testEnvelope.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });
  });

  describe('/transactions (Budget Transactions)', () => {
    describe('POST /transactions', () => {
      it('should create a new transaction', async () => {
        const transactionData = {
          description: 'Grocery shopping',
          amount: -50,
          envelopeId: testEnvelope.id,
          date: '2024-01-15',
        };

        const response = await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(transactionData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.description).toBe('Grocery shopping');
        expect(response.body.amount).toBe(-50);
      });
    });

    describe('GET /transactions/envelope/:envelopeId', () => {
      it('should get transactions for an envelope', async () => {
        const transactionData = {
          description: 'Test transaction',
          amount: -25,
          envelopeId: testEnvelope.id,
        };

        await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(transactionData);

        const response = await request(app.getHttpServer())
          .get(`/transactions/envelope/${testEnvelope.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].description).toBe('Test transaction');
      });
    });
  });

  describe('Budget Workflow Integration', () => {
    it('should complete full budget management workflow', async () => {
      const envelopeData = {
        name: 'Entertainment',
        amount: 300,
        userId: testUser.id,
        month: 3,
        year: 2024,
        icone: '🎬',
      };

      const envelopeResponse = await request(app.getHttpServer())
        .post('/envelopes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(envelopeData)
        .expect(201);

      const envelope = envelopeResponse.body;

      const transactions = [
        { description: 'Movie tickets', amount: -30, envelopeId: envelope.id },
        { description: 'Dinner out', amount: -50, envelopeId: envelope.id },
        { description: 'Concert tickets', amount: -80, envelopeId: envelope.id },
      ];

      for (const transaction of transactions) {
        await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(transaction)
          .expect(201);
      }

      const transactionsResponse = await request(app.getHttpServer())
        .get(`/transactions/envelope/${envelope.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(transactionsResponse.body).toHaveLength(3);

      const totalSpent = transactionsResponse.body.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      expect(totalSpent).toBe(-160);

      const remainingBudget = envelope.amount + totalSpent;
      expect(remainingBudget).toBe(140);
    });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
