import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { WorkerServicePayload } from "../decorators/payload/WorkerServicePayload";

/**
 * Refresh JWT access tokens for worker service.
 *
 * This operation validates the provided refresh token specific to the
 * workerService authorization role and issues new JWT tokens (access and
 * refresh) with appropriate expiration timestamps. It ensures the user
 * associated with the token exists and is active.
 *
 * @param props - Object containing workerService payload and refresh token body
 * @param props.workerService - The authenticated worker service user payload
 * @param props.body - Request body carrying the refresh token string
 * @returns Authorized information including user details and refreshed tokens
 * @throws {Error} Throws if token verification fails, user not found, or token
 *   types mismatch
 */
export async function postauthWorkerServiceRefresh(props: {
  workerService: WorkerServicePayload;
  body: INotificationWorkflowWorkerService.IRefresh;
}): Promise<INotificationWorkflowWorkerService.IAuthorized> {
  const { body } = props;

  // Verify and decode refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    id: string & tags.Format<"uuid">;
    type: string;
    token_type?: string;
  };

  // Validate token type and user type discriminator
  if (decoded.token_type !== "refresh" || decoded.type !== "workerService") {
    throw new Error("Invalid token type or user role");
  }

  // Retrieve worker service user by id
  const workerService =
    await MyGlobal.prisma.notification_workflow_workerservices.findUnique({
      where: { id: decoded.id },
    });

  if (!workerService || workerService.deleted_at !== null) {
    throw new Error("User not found or deleted");
  }

  // Generate new access token
  const accessToken = jwt.sign(
    { id: workerService.id, type: "workerService" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    { id: workerService.id, type: "workerService", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration timestamps
  const expiredAt = ((): string & tags.Format<"date-time"> => {
    const now = Date.now();
    // Add 1 hour
    const expires = new Date(now + 3600 * 1000).toISOString();
    return expires as string & tags.Format<"date-time">;
  })();

  const refreshableUntil = ((): string & tags.Format<"date-time"> => {
    const now = Date.now();
    // Add 7 days
    const expires = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    return expires as string & tags.Format<"date-time">;
  })();

  // Return the authorized user info with tokens
  return {
    id: workerService.id,
    email: workerService.email,
    password_hash: workerService.password_hash,
    created_at: toISOStringSafe(workerService.created_at),
    updated_at: toISOStringSafe(workerService.updated_at),
    deleted_at: workerService.deleted_at
      ? toISOStringSafe(workerService.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
