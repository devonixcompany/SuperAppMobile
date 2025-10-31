import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
