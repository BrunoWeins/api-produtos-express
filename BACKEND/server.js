require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Router para a Vercel
const router = express.Router();
app.use('/api', router);

// Servir arquivos estáticos (para ambiente local)
app.use(express.static('public'));

// Configuração do PostgreSQL (Supabase)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// -------------------------------------------------------------
// ROTAS
// -------------------------------------------------------------

// GET: Busca todos os produtos
router.get('/produtos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produtos ORDER BY id ASC');
        res.json(result.rows);
    } catch (erro) {
        console.error('Erro ao buscar produtos:', erro);
        res.status(500).json({ erro: "Erro ao buscar produtos no banco de dados." });
    }
});

// POST: Insere um novo produto
router.post('/produtos', async (req, res) => {
    const { nome, preco, quantidade } = req.body;

    const p = parseFloat(preco);
    const q = parseInt(quantidade, 10);

    // Permite quantidade 0 (produto esgotado) e preço maior que 0
    if (!nome || isNaN(p) || isNaN(q) || p <= 0 || q < 0) {
        return res.status(400).json({ erro: "Dados inválidos enviados para o servidor" });
    }

    try {
        const query = `
            INSERT INTO produtos(nome, preco, quantidade)
            VALUES($1, $2, $3)
            RETURNING *
        `;
        const values = [nome, p, q];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar produto:', error);
        res.status(500).json({ erro: 'Erro interno ao salvar produto' });
    }
});

// DELETE: Remove produto por ID
router.delete('/produtos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM produtos WHERE id = $1', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Produto não encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar produto:', error);
        res.status(500).json({ erro: "Erro ao deletar produto." });
    }
});

// DELETE: Limpa todos os produtos
router.delete('/produtos', async (req, res) => {
    try {
        await pool.query('DELETE FROM produtos');
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao limpar produtos:', error);
        res.status(500).json({ erro: "Erro ao limpar banco de dados." });
    }
});

// -------------------------------------------------------------
// INICIALIZAÇÃO LOCAL
// -------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor backend rodando localmente na porta ${PORT}`);
    });
}

module.exports = app;
