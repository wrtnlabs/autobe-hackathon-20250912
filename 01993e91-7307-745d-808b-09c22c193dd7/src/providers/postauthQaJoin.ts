import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Create new QA user account and issue JWT tokens.
 *
 * This endpoint registers a new QA user by validating unique email, securely
 * hashing the password, inserting a new record into the task_management_qa
 * table, and issuing JWT access and refresh tokens.
 *
 * The access token expires in 1 hour, and the refresh token in 7 days. Both
 * tokens have issuer set to 'autobe'.
 *
 * @param props - Object containing authenticated QA payload (unused here) and
 *   user creation data.
 * @param props.qa - Authenticated QA user payload (not required for join but
 *   part of standard props).
 * @param props.body - The user creation data with email, password_hash, and
 *   name.
 * @returns The newly created authorized user including JWT tokens.
 * @throws {Error} When the email is already registered.
 */
export async function postauthQaJoin(props: {
  qa: QaPayload;
  body: ITaskManagementQa.ICreate;
}): Promise<ITaskManagementQa.IAuthorized> {
  const { body } = props;

  // Check if email is already registered
  const existing = await MyGlobal.prisma.task_management_qa.findUnique({
    where: { email: body.email },
  });
  if (existing) throw new Error("Email already registered");

  // Hash the plain password
  const hashedPassword = await MyGlobal.password.hash(body.password_hash);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create new user
  const newUser = await MyGlobal.prisma.task_management_qa.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT access token
  const accessToken = jwt.sign(
    { id: newUser.id, type: "qa" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    { id: newUser.id, type: "qa", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: newUser.id,
    email: newUser.email,
    password_hash: newUser.password_hash,
    name: newUser.name,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
