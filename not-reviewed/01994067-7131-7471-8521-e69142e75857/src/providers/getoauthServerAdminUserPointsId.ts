import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed information about a user point record specified by its
 * unique identifier.
 *
 * This operation is restricted to users with admin privileges due to sensitive
 * data exposure.
 *
 * @param props - Object containing the admin authentication payload and the
 *   unique identifier of the user point record.
 * @param props.admin - The authenticated admin making the request.
 * @param props.id - The UUID of the user point record to retrieve.
 * @returns The detailed user point record matching the given id.
 * @throws {Error} If no user point record exists with the given id.
 */
export async function getoauthServerAdminUserPointsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerUserPoint> {
  const { admin, id } = props;

  // Authorization is done externally via admin payload, no further checks here

  const record =
    await MyGlobal.prisma.oauth_server_user_points.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id as string & tags.Format<"uuid">,
    user_id: record.user_id as string & tags.Format<"uuid">,
    balance: record.balance as number & tags.Type<"int32">,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
