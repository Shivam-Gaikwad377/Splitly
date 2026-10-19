import bcrypt from "bcryptjs";
import { pool } from "../../config/database";

const email = "test@splitly.dev";
const password = "Test@12345";
const name = "Splitly Test User";
const phone = null;
const email_isverified = true;

async function seed() {
    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert user
    const result = await pool.query(
        "INSERT INTO users (email, password_hash, name, phone, email_isverified) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [email, hashedPassword, name, phone, email_isverified]
    );

    // log result
    console.log(result.rows[0]);

    await pool.end();
}

seed().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});