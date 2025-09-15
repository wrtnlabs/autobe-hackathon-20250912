import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";

/**
 * Registers a new workflowManager user.
 *
 * This endpoint allows public registration of workflowManager users by
 * providing a unique email and password hash. It ensures the email is not
 * already in use, creates the user record with audit timestamps, and issues JWT
 * access and refresh tokens.
 *
 * @param props - Object containing the request body for workflowManager user
 *   creation
 * @returns The authorized workflowManager user session data including JWT
 *   tokens
 * @throws {Error} When a user with the provided email already exists
 */
export async function postauthWorkflowManagerJoin(props: {
  body: INotificationWorkflowWorkflowManager.ICreate;
}): Promise<INotificationWorkflowWorkflowManager.IAuthorized> {
  const { body } = props;

  const existingUser =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUnique({
      where: { email: body.email },
    });
  if (existingUser !== null) {
    throw new Error(
      `WorkflowManager user with email '${body.email}' already exists.`,
    );
  }

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const createdUser =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.create({
      data: {
        id,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const accessToken = jwt.sign(
    {
      userId: createdUser.id,
      email: createdUser.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: createdUser.id,
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
    id: createdUser.id,
    email: createdUser.email,
    password_hash: createdUser.password_hash,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
