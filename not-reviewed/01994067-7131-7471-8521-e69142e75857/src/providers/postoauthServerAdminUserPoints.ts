import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerUserPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerUserPoint";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a user point record, initializing point balance for a given user.
 *
 * This operation is restricted to admins due to financial sensitivity. It
 * validates the user existence before creation.
 *
 * @param props - Object containing admin payload and body with user point data
 * @param props.admin - Authenticated admin performing the operation
 * @param props.body - Data to create user point record including user_id and
 *   balance
 * @returns The created user point record with all fields populated including
 *   timestamps
 * @throws {Error} When the referenced user does not exist
 */
export async function postoauthServerAdminUserPoints(props: {
  admin: AdminPayload;
  body: IOauthServerUserPoint.ICreate;
}): Promise<IOauthServerUserPoint> {
  const { admin, body } = props;

  // Verify user existence
  const user = await MyGlobal.prisma.oauth_server_members.findUnique({
    where: { id: body.user_id },
  });
  if (!user) {
    throw new Error("User not found");
  }

  // Prepare current timestamp in ISO string format
  const now = toISOStringSafe(new Date());

  // Create user point record
  const created = await MyGlobal.prisma.oauth_server_user_points.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: body.user_id,
      balance: body.balance,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Return created record with properly formatted date strings
  return {
    id: created.id,
    user_id: created.user_id,
    balance: created.balance,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
