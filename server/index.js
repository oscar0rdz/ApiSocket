import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const db = createClient({
    url: "libsql://lucky-blackheart-oscar0rdz.turso.io",
    authToken: process.env.DB_TOKEN
});

// Crear la tabla al iniciar el servidor
(async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT,
                user TEXT
            )
        `);
        console.log('Tabla messages creada (si no existía).');
    } catch (error) {
        console.error('Error al crear la tabla:', error);
    }
})();

io.on('connection', (socket) => {
    console.log('A user connected con éxito');

    socket.on('disconnect', () => {
        console.log('User desconectado');
    });

    socket.on('new message', async (msg) => {
        let result;

        try {
            // Asegúrate de que el parámetro SQL se llama correctamente
            result = await db.execute({
                sql: 'INSERT INTO messages (content) VALUES (?)',
                args: [msg]
            });
            io.emit('chat message', msg, result.lastInsertRowid.toString());
        } catch (e) {
            console.error('Error al insertar mensaje:', e);
        }
    });
});

// Configuración de CSP antes de servir archivos estáticos
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "script-src 'self' https://cdn.socket.io; object-src 'none';");
    next();
});

app.use(logger('dev'));

// Servir archivos estáticos desde la carpeta 'cliente'
app.use(express.static(path.join(process.cwd(), 'cliente')));

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'cliente', 'index.html'));
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
