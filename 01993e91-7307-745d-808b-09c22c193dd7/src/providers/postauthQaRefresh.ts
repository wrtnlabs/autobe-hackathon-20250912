import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Refresh QA user access token
 *
 * This API endpoint refreshes JWT access tokens by validating the refresh
 * token, extracting the user information, and issuing new tokens for ongoing
 * authorization.
 *
 * @param props - Object containing QA user authentication payload and refresh
 *   token
 * @param props.qa - The authenticated QA user payload
 * @param props.body - The request body containing refresh token
 * @returns The updated authorization info with new JWT tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the user linked to the token does not exist or is
 *   deleted
 */
export async function postauthQaRefresh(props: {
  qa: QaPayload;
  body: ITaskManagementQa.IRefresh;
}): Promise<ITaskManagementQa.IAuthorized> {
  const { body } = props;

  // Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  // Runtime type narrowing for decoded token
  typia.assertGuard<{ id: string & tags.Format<"uuid">; type: "qa" }>(decoded);

  // Fetch user based on decoded token id, ensure not deleted
  const user = await MyGlobal.prisma.task_management_qa.findFirst({
    where: { id: decoded.id, deleted_at: null },
  });

  if (!user) throw new Error("QA user not found or deleted");

  // Compute expiry timestamps as ISO strings
  const nowISO = toISOStringSafe(new Date());
  const accessExpiryISO = toISOStringSafe(
    new Date(new Date().getTime() + 30 * 60 * 1000),
  );
  const refreshExpiryISO = toISOStringSafe(
    new Date(new Date().getTime() + 14 * 24 * 60 * 60 * 1000),
  );

  // Generate new access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "qa",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "30m" },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    { id: user.id, type: "qa", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe", expiresIn: "14d" },
  );

  // Return authorization response
  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    name: user.name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryISO,
      refreshable_until: refreshExpiryISO,
    },
  };
}
