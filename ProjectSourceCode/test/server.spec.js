// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************

describe('Testing1', () => {
  it('positive : /register', done => {
    chai
      .request(server)
      .post('/register')
      .send({
        username: 'andrewsFootFungus',
        password: 'bigFella',
        height: '175',
        weight: '70',
        age: '30',
        gender: 'Male',
        activity_level: '3-4 times a week',
        weight_goal: 'Maintain',
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});

describe('Testing2', () => {
  it('negative: /register - Invalid credentials should return 400', done => {
    chai
      .request(server)
      .post('/register')
      .send({
        username: '400',
        password: 'CU12345',
        height: '160',
        weight: '55',
        age: '25',
        gender: 'Female',
        activity_level: '5-7 times a week',
        weight_goal: 'Lose Weight',
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});

describe('Testing3', () => {
  it('negative: /login - Invalid credentials should return 400', done => {
    chai
      .request(server)
      .post('/login')
      .send({username: '400', password: 'andrewsFoot'})
      .end((err, res) => {
        expect(res).to.have.status(400);
        done();
      });
  });
});

describe('Testing 4', () => {
  it('positive: /login - should render the home page with user information', (done) => {
    chai.request(server)
      .post('/login')
      .send({ username: 'andrewsFootFungus', password: 'bigFella' }) 
      .redirects(0)
      .end((error, res) => {
        expect(error).to.be.null;
        expect(res).to.have.status(302);
            res.should.redirectTo(/\/home$/); 
            done();
          });
      });
});

describe('Testing 5', () => {
  it('negative: /login - should return status 400 for invalid credentials', (done) => {
    chai.request(server)
      .post('/login')
      .redirects(0)
      .send({ username: 'Andrew', password: 'smallFella' }) 
      .end((error, res) => {
        expect(error).to.be.null;
        expect(res).to.have.status(400);
        done();
      });
  });
});

describe('Testing 6', () => {
  it('negative: /login - should return status 400 for invalid credentials', (done) => {
    chai.request(server)
      .post('/login')
      .send({ username: 'andrewsFootFungus', password: 'smallFella' }) 
      .end((error, res) => {
        expect(error).to.be.null;
        expect(res).to.have.status(400);
        done();
      });
  });
});
