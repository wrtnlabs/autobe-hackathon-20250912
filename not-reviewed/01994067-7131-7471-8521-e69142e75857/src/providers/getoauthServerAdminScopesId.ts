import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerScope } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerScope";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details of a specific OAuth scope by ID.
 *
 * This endpoint retrieves detailed information about a single OAuth 2.0 scope,
 * including its unique code, description, and audit timestamps.
 *
 * Access is restricted to administrators for security and scope integrity.
 *
 * @param props - Object containing the admin payload and scope ID
 * @param props.admin - The authenticated admin making the request
 * @param props.id - The unique identifier of the OAuth scope
 * @returns Detailed OAuth scope information conforming to IOauthServerScope
 * @throws Error if the scope does not exist
 */
export async function getoauthServerAdminScopesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerScope> {
  const { admin, id } = props;

  // Authorization is handled externally by the admin decorator

  // Fetch the OAuth scope record by id, throw if not found
  const scope = await MyGlobal.prisma.oauth_server_scopes.findUniqueOrThrow({
    where: { id },
  });

  // Return mapped scope information with ISO 8601 date-time format strings
  return {
    id: scope.id,
    code: scope.code,
    description: scope.description,
    created_at: toISOStringSafe(scope.created_at),
    updated_at: toISOStringSafe(scope.updated_at),
    deleted_at: scope.deleted_at ? toISOStringSafe(scope.deleted_at) : null,
  };
}
