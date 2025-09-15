import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Registers a new Project Management Officer (PMO) user account.
 *
 * This operation allows public registration of PMO users with unique emails. It
 * securely hashes the provided password, creates the user record, and issues
 * JWT access and refresh tokens for authentication.
 *
 * @param props - The registration input and caller information.
 * @param props.pmo - The PMO payload (not used in registration but required by
 *   interface).
 * @param props.body - The registration details including email, plaintext
 *   password, and name.
 * @returns The authorized PMO user information with JWT tokens.
 * @throws {Error} If the email is already registered with an active account.
 */
export async function postauthPmoJoin(props: {
  pmo: PmoPayload;
  body: ITaskManagementPmo.IJoin;
}): Promise<ITaskManagementPmo.IAuthorized> {
  const { body } = props;

  const existingUser = await MyGlobal.prisma.task_management_pmo.findFirst({
    where: { email: body.email, deleted_at: null },
  });

  if (existingUser) {
    throw new Error(`Email already registered: ${body.email}`);
  }

  const hashedPassword = await MyGlobal.password.hash(body.password);

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_pmo.create({
    data: {
      id,
      email: body.email,
      password_hash: hashedPassword,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
      type: "pmo",
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

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
