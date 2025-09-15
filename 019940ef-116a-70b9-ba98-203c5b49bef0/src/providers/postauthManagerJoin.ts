import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Registers a new manager account in the Job Performance Evaluation system.
 *
 * This function creates a new manager user after ensuring the provided email is
 * unique among active managers. The user's password is securely hashed before
 * storage.
 *
 * After creation, JWT access and refresh tokens are generated with a 1-hour and
 * 7-day expiration respectively, both issued by 'autobe'.
 *
 * @param props - The input parameters containing manager registration data.
 * @param props.manager - The manager payload (not used in this public join
 *   operation but present).
 * @param props.body - The registration details including email, password, and
 *   name.
 * @returns The newly created manager's authorized information including JWT
 *   tokens.
 * @throws {Error} Throws an error if the email is already in use by an active
 *   manager.
 */
export async function postauthManagerJoin(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManager.ICreate;
}): Promise<IJobPerformanceEvalManager.IAuthorized> {
  const { body } = props;

  // Check if manager with the given email and not deleted already exists
  const existing =
    await MyGlobal.prisma.job_performance_eval_managers.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error("DuplicateManagerEmail");
  }

  // Hash the password securely
  const hashedPassword = await MyGlobal.password.hash(body.password);

  // Generate a new UUID v4 for the manager ID
  const newId = v4() as string & tags.Format<"uuid">;

  // Current timestamp in ISO string format
  const now = toISOStringSafe(new Date());

  // Create the new manager record in the database
  const created = await MyGlobal.prisma.job_performance_eval_managers.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Generate JWT access token with payload
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

  // Generate JWT refresh token with payload
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

  // Calculate expiration timestamps for tokens
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Return the authorized manager data
  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
