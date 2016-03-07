import express from 'express';

const app = express();
const api = express.Router();

api.get('/', (req, res) => {
  res.send('Hello from API');
});

app.use('/api', api);

app.listen(5001);

process.once('SIGUSR2', () => {
  process.kill(process.pid, 'SIGUSR2');
});
