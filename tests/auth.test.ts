import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";

// ==========================================
// TEST AUTH
// ==========================================
describe("Auth API", () => {
    let authToken: string; // Scope isolato per Auth

    beforeAll(async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "auth-test@unique.com", password: "pass123", name: "Auth User" });

        if (!res.body.token) throw new Error("Registrazione Auth fallita");
        authToken = res.body.token;
    });

    it("registers a new user and returns token", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "new-auth@unique.com", password: "pass123" });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("token");
    });

    it("logs in with valid credentials", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "auth-test@unique.com", password: "pass123" });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("token");
    });

    it("rejects login with wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "auth-test@unique.com", password: "wrongpass" });

        expect(res.status).toBe(401);
    });

    it("requires valid token for protected routes", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });

    it("accepts valid token for protected routes", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(200);
    });
});

// ==========================================
// TEST TASK
// ==========================================
describe("Task API", () => {
    let taskToken: string; // Scope isolato per Task
    let taskId: string;

    beforeAll(async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ email: "task-test@unique.com", password: "pass123", name: "Task User" });

        if (!res.body.token) throw new Error("Registrazione Task fallita");
        taskToken = res.body.token;
    });

    it("creates a new task", async () => {
        const res = await request(app)
            .post("/api/tasks")
            .set("Authorization", `Bearer ${taskToken}`)
            .send({ title: "Test Task", description: "First task" });

        expect(res.status).toBe(201);
        expect(res.body.title).toBe("Test Task");
        expect(res.body.completed).toBe(false);
        taskId = res.body.id;
    });

    it("lists user tasks", async () => {
        const res = await request(app)
            .get("/api/tasks")
            .set("Authorization", `Bearer ${taskToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it("updates task completion", async () => {
        const res = await request(app)
            .patch(`/api/tasks/${taskId}`)
            .set("Authorization", `Bearer ${taskToken}`)
            .send({ completed: true });

        expect(res.status).toBe(200);
        expect(res.body.completed).toBe(true);
    });

    it("deletes a task", async () => {
        const res = await request(app)
            .delete(`/api/tasks/${taskId}`)
            .set("Authorization", `Bearer ${taskToken}`);

        expect(res.status).toBe(204);
    });

    it("rejects unauthenticated access", async () => {
        const res = await request(app).get("/api/tasks");
        expect(res.status).toBe(401);
    });
});