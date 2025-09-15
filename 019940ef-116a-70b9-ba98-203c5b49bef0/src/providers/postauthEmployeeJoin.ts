import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";

/**
 * Registers a new employee user in the Job Performance Evaluation system.
 *
 * This endpoint creates an employee account with a unique email and hashed
 * password, ensuring no duplicates exist. Upon successful creation, it issues
 * JWT access and refresh tokens to enable authenticated API access.
 *
 * @param props - Contains the request body with employee creation data.
 * @param props.body - Employee creation payload including email, hashed
 *   password, and name.
 * @returns The authorized employee data including tokens and timestamps.
 * @throws {Error} If the email is already registered.
 */
export async function postauthEmployeeJoin(props: {
  body: IJobPerformanceEvalEmployee.ICreate;
}): Promise<IJobPerformanceEvalEmployee.IAuthorized> {
  const { body } = props;

  // Check if email is already used
  const existing =
    await MyGlobal.prisma.job_performance_eval_employees.findUnique({
      where: { email: body.email },
    });
  if (existing) throw new Error(`Email '${body.email}' is already registered`);

  // Generate new UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new employee record
  const created = await MyGlobal.prisma.job_performance_eval_employees.create({
    data: {
      id,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT tokens expiry strings
  const tokenExpiresAt = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60)); // 1 hour from now
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7 days from now

  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: tokenExpiresAt,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: tokenExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
