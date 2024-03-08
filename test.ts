import request from 'supertest';
import { app, closeServer, server } from './server'; 
import fs from 'fs';
import bcrypt from 'bcrypt';

const USERS_FILE = 'users.json';

// Before all tests, create a test user
beforeAll(() => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    users.push({ username: 'testUser', password: bcrypt.hashSync('testPassword', 10) });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users), 'utf8');
});

// After all tests, remove the test users
afterAll(() => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const filteredUsers = users.filter((user: any) => user.username !== 'testUser' && user.username !== 'newUser');
    fs.writeFileSync(USERS_FILE, JSON.stringify(filteredUsers, null,2), 'utf8');
});


describe('User Authentication API', () => {
    describe('POST /register', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/register')
                .send({ username: 'newUser', password: 'newPassword' });
            expect(res.status).toBe(201);
        });

        it('should return 409 if username already exists', async () => {
            const res = await request(app)
                .post('/register')
                .send({ username: 'testUser', password: 'testPassword' });
            expect(res.status).toBe(409);
        });

        it('should return 400 if request body is invalid', async () => {
            const res = await request(app)
                .post('/register')
                .send({ invalidKey: 'invalidValue' });
            expect(res.status).toBe(400);
        });
    });

    describe('POST /login', () => {
        it('should log in with correct credentials', async () => {
            const res = await request(app)
                .post('/login')
                .send({ username: 'testUser', password: 'testPassword' });
            expect(res.status).toBe(200);
        });

        it('should return 401 with incorrect password', async () => {
            const res = await request(app)
                .post('/login')
                .send({ username: 'testUser', password: 'wrongPassword' });
            expect(res.status).toBe(401);
        });

        it('should return 401 with non-existing username', async () => {
            const res = await request(app)
                .post('/login')
                .send({ username: 'nonExistingUser', password: 'anyPassword' });
            expect(res.status).toBe(401);
        });

        it('should return 400 if request body is invalid', async () => {
            const res = await request(app)
                .post('/login')
                .send({ invalidKey: 'invalidValue' });
            expect(res.status).toBe(400);
        });
    });
});

describe('Task Management API', () => {
    let taskId;

    it('should create a new task', async () => {
        const taskData = {
            title: 'Sample Task',
            description: 'This is a sample task description.',
            dueDate: '2024-03-15', // Provide a valid date format
            assignedTo: 'username', // Provide a valid username
            category: 'Sample Category',
            status: 'Pending' // Or 'Completed', depending on your needs
        };
        

        const response = await request(app)
            .post('/task')
            .send(taskData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        taskId = response.body.id;
    });

    it('should retrieve a task by its ID', async () => {
        const response = await request(app).get(`/task/${taskId}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', taskId);
    });

    it('should update a specific task', async () => {
        const updatedTaskData = {
            // Provide updated task data here
        };

        const response = await request(app)
            .put(`/task/${taskId}`)
            .send(updatedTaskData);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject(updatedTaskData);
    });

    it('should delete a specific task', async () => {
        const response = await request(app).delete(`/task/${taskId}`);
        
        expect(response.status).toBe(204);
    });

    it('should retrieve all tasks', async () => {
        const response = await request(app).get('/tasks');
        
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should retrieve all tasks assigned to a specific user', async () => {
        const assignedTo = 'username'; // Provide a valid username here
        
        const response = await request(app).get(`/tasks?assignedTo=${assignedTo}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        // Additional assertions as needed
    });

    it('should retrieve all tasks under a specific category', async () => {
        const category = 'categoryName'; // Provide a valid category name here
        
        const response = await request(app).get(`/tasks?category=${category}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        // Additional assertions as needed
    });
});


afterAll(async () => {
    await closeServer(server);
});