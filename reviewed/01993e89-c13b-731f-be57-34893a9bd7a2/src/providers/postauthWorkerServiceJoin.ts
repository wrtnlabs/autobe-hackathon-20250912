import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { WorkerServicePayload } from "../decorators/payload/WorkerServicePayload";

/**
 * Create worker service account and issue JWT tokens.
 *
 * This operation registers a new automated worker service user with a unique
 * email and hashed password. It stores the credentials securely and issues JWT
 * access and refresh tokens for authentication.
 *
 * @param props - Input object containing workerService payload and account
 *   creation data
 * @param props.workerService - The authenticated workerService user (not used
 *   in join)
 * @param props.body - The creation data including email and password_hash
 * @returns The authorized worker service response including tokens and
 *   timestamps
 * @throws {Error} Throws if an account with the given email already exists
 */
export async function postauthWorkerServiceJoin(props: {
  workerService: WorkerServicePayload;
  body: INotificationWorkflowWorkerService.ICreate;
}): Promise<INotificationWorkflowWorkerService.IAuthorized> {
  const { body } = props;

  // Validate uniqueness of email
  const existing =
    await MyGlobal.prisma.notification_workflow_workerservices.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new Error(`Worker service with email ${body.email} already exists.`);
  }

  // Prepare timestamps in ISO string format
  const now = toISOStringSafe(new Date());

  // Create new worker service account record
  const created =
    await MyGlobal.prisma.notification_workflow_workerservices.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        email: body.email,
        password_hash: body.password_hash,
        created_at: now,
        updated_at: now,
      },
    });

  // Generate JWT tokens for authorization
  const accessToken = jwt.sign(
    { userId: created.id, email: created.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { userId: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Compute token expiration timestamps
  const accessExpiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Return complete authorized response
  return {
    id: created.id,
    email: created.email as string & tags.Format<"email">,
    password_hash: created.password_hash,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at
      ? (created.deleted_at as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
