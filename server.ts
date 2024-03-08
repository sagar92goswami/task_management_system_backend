import express, { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'fs';
import bcrypt from 'bcrypt';

// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Define Swagger options
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Task Management API',
            version: '1.0.0',
            description: 'A simple RESTful API for managing tasks',
        },
    },
    apis: ['server.ts'], // Path to the API files
};

// Initialize Swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const USERS_FILE = 'users.json';

// Function to read user data from the JSON file
function readUsers(): any[] {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Function to write user data to the JSON file
function writeUsers(users: any[]): void {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Endpoint for user registration
/**
 * @openapi
 * /register:
 *   post:
 *     summary: Register a new user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Invalid username or password.
 *       409:
 *         description: Username already exists.
 */
app.post('/register', (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Validate username and password
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if the username already exists
    const users = readUsers();
    if (users.some((user: any) => user.username === username)) {
        return res.status(409).json({ message: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Add the new user to the JSON file
    const newUser = { username, password: hashedPassword };
    users.push(newUser);
    writeUsers(users);

    res.status(201).json({ message: 'User registered successfully' });
});

// Endpoint for user login
/**
 * @openapi
 * /login:
 *   post:
 *     summary: Log in with username and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Invalid username or password.
 */
app.post('/login', (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find the user in the JSON file
    const users = readUsers();
    const user = users.find((u: any) => u.username === username);

    // Check if the user exists
    if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check if the password is correct
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful' });
});


// Dummy data for testing
interface Task {
    id: number;
    title: string;
    description: string;
    creationDate: Date;
    dueDate?: Date;
    assignedTo: string;
    category: string;
    status: 'Pending' | 'Completed';
}

let tasks: Task[] = [];

/**
 * @openapi
 * /:
 *   get:
 *     summary: Get API information.
 *     responses:
 *       200:
 *         description: Returns the API information.
 */
app.get('/', (req: Request, res: Response) => {
    res.send('Task Management API');
});

/**
 * @openapi
 * /task:
 *   post:
 *     summary: Create a new task.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: Created a new task successfully.
 */
app.post('/task', (req: Request, res: Response) => {
    const { title, description, dueDate, assignedTo, category } = req.body;
    const newTask: Task = {
        id: tasks.length + 1,
        title,
        description,
        creationDate: new Date(),
        dueDate,
        assignedTo,
        category,
        status: 'Pending'
    };
    tasks.push(newTask);
    res.status(201).json(newTask);
});

/**
 * @openapi
 * /task/{id}:
 *   get:
 *     summary: Retrieve a task by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID of the task to retrieve.
 *     responses:
 *       200:
 *         description: Returns the task.
 *       404:
 *         description: Task not found.
 */
app.get('/task/:id', (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    const task = tasks.find(task => task.id === taskId);
    if (task) {
        res.json(task);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

/**
 * @openapi
 * /task/{id}:
 *   put:
 *     summary: Update a specific task.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID of the task to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: Updated task successfully.
 *       404:
 *         description: Task not found.
 */
app.put('/task/:id', (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...req.body };
        res.json(tasks[taskIndex]);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

/**
 * @openapi
 * /task/{id}:
 *   delete:
 *     summary: Delete a specific task.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           format: int64
 *         description: ID of the task to delete.
 *     responses:
 *       204:
 *         description: Task deleted successfully.
 *       404:
 *         description: Task not found.
 */
app.delete('/task/:id', (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks.splice(taskIndex, 1);
        res.sendStatus(204);
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: Retrieve tasks based on query parameters.
 *     parameters:
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Username of the user to filter tasks by assignedTo.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category name to filter tasks by category.
 *     responses:
 *       200:
 *         description: Returns tasks based on query parameters.
 *       400:
 *         description: Invalid request. Please provide a valid username or category.
 */
app.get('/tasks', (req: Request, res: Response) => {
    const { assignedTo, category } = req.query;
    let filteredTasks = tasks;

    if (assignedTo) {
        filteredTasks = filteredTasks.filter(task => task.assignedTo === assignedTo);
    }

    if (category) {
        filteredTasks = filteredTasks.filter(task => task.category === category);
    }

    if (assignedTo || category) {
        res.json(filteredTasks);
    } else {
        res.json(tasks); // Return all tasks if no query parameters are provided
    }
});


// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
export const closeServer = (server: any) => {
    return new Promise<void>((resolve, reject) => {
        server.close((err: any) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

export { app, server }; // Exporting the app object
