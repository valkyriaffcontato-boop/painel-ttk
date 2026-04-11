const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // O Render preenche a variável PORT automaticamente

app.get('/', (req, res) => res.send('Bot Online!'));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
