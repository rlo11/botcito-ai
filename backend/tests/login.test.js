const request = require('supertest');

jest.mock('../models/User', () => ({
  findOne: jest.fn().mockResolvedValue(null)
}));

const app = require('../server');

describe('POST /api/auth/login', () => {
  it('returns 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid@example.com', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});