# NameApp

This application is a simple contact management system with a React frontend and a Flask/PostgreSQL backend.

## How to Run the Application

You will need two separate terminal windows to run the application. You must have Docker and Node.js installed on your system.

---

### Terminal 1: Start the Backend and Database (Docker)

1.  **Navigate to the project root directory:**
    ```bash
    cd /home/mambrogi/gcli/NameApp
    ```

2.  **Build and start the Docker containers:**
    ```bash
    docker-compose up --build
    ```

    This command will:
    *   Pull the official PostgreSQL image.
    *   Build a Docker image for the Flask backend.
    *   Start both the database and backend services.
    *   The first time you run this, it will create the `person` table in the `nameapp` database.

    The backend API will be running at `http://localhost:5000`.

---

### Terminal 2: Start the Frontend (React)

1.  **Navigate to the frontend directory:**
    ```bash
    cd /home/mambrogi/gcli/NameApp/frontend
    ```

2.  **Install dependencies (if you haven't already):**
    ```bash
    npm install
    ```

3.  **Start the React development server:**
    ```bash
    npm start
    ```

---

### Accessing the Application

*   Once both servers are running, you can access the application by navigating to the following URL in your web browser:

    **`http://localhost:3000`**
