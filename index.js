const express = require("express");
const { Client } = require("pg");
const cors = require("cors");
const bodyparser = require("body-parser");
const config = require("./config");

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyparser.json());

var conString = config.urlConnection;
var client = new Client(conString);
client.connect((err) => {
    if (err) {
        return console.error('Não foi possível conectar ao banco.', err);
    }
    client.query('SELECT NOW()', (err, result) => {
        if (err) {
            return console.error('Erro ao executar a query.', err);
        }
        console.log(result.rows[0]);
    });
});

app.get("/", (req, res) => {
    console.log("Response ok.");
    res.send("Ok – Servidor disponível.");
});
// Rota para verificar se o e-mail já está cadastrado
app.get("/cadastro/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const result = await client.query("SELECT * FROM cadastro WHERE email = $1", [email]);
      if (result.rowCount > 0) {
        return res.status(200).json({ message: "E-mail já cadastrado." });
      }
      res.status(404).json({ message: "E-mail disponível." });
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      res.status(500).json({ error: "Erro ao verificar e-mail." });
    }
  });

  // Buscar respostas de um usuário pelo e-mail
app.get("/respostas/usuario/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const result = await client.query(
        `SELECT * FROM respostas
        WHERE user_id = (SELECT id FROM cadastro WHERE email = $1)`,
        [email]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Nenhuma resposta encontrada para este e-mail." });
      }
      res.json(result.rows);
    } catch (err) {
      console.error("Erro ao buscar respostas do usuário:", err);
      res.status(500).json({ error: "Erro ao buscar respostas." });
    }
  });
// Criar um novo usuário
app.post("/cadastro", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "E-mail é obrigatório." });

        const result = await client.query(
            "INSERT INTO cadastro (email) VALUES ($1) RETURNING *",
            [email]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar usuário:", err);
        res.status(500).json({ error: "Erro ao criar usuário." });
    }
});

// Deletar um usuário
app.delete("/cadastro/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await client.query("DELETE FROM cadastro WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        res.json({ message: "Usuário deletado com sucesso." });
    } catch (err) {
        console.error("Erro ao deletar usuário:", err);
        res.status(500).json({ error: "Erro ao deletar usuário." });
    }
});

// Rotas para a tabela `respostas`

// Listar todas as respostas
app.get("/respostas", async (req, res) => {
    try {
        const result = await client.query("SELECT * FROM respostas");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar respostas:", err);
        res.status(500).json({ error: "Erro ao buscar respostas." });
    }
});

// Criar uma nova resposta
app.post("/respostas", async (req, res) => {
    try {
        const { user_id, pergunta_id, resposta_chave } = req.body;

        if (!user_id || !pergunta_id || !resposta_chave) {
            return res.status(400).json({ error: "Todos os campos são obrigatórios." });
        }

        const result = await client.query(
            "INSERT INTO respostas (user_id, pergunta_id, resposta_chave) VALUES ($1, $2, $3) RETURNING *",
            [user_id, pergunta_id, resposta_chave]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar resposta:", err);
        res.status(500).json({ error: "Erro ao criar resposta." });
    }
});

// Buscar respostas de um usuário específico
app.get("/respostas/usuario/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await client.query(
            "SELECT * FROM respostas WHERE user_id = $1",
            [user_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Nenhuma resposta encontrada para este usuário." });
        }
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar respostas do usuário:", err);
        res.status(500).json({ error: "Erro ao buscar respostas." });
    }
});

// Buscar respostas pelo ID da pergunta
app.get("/respostas/pergunta/:pergunta_id", async (req, res) => {
    try {
        const { pergunta_id } = req.params;
        const result = await client.query(
            "SELECT * FROM respostas WHERE pergunta_id = $1",
            [pergunta_id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Nenhuma resposta encontrada para esta pergunta." });
        }
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar respostas da pergunta:", err);
        res.status(500).json({ error: "Erro ao buscar respostas." });
    }
});

app.listen(config.port, () =>
    console.log("Servidor funcionando na porta " + config.port)
);