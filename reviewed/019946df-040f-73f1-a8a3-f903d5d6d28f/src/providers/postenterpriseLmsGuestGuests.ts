import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Create a new guest user in the Enterprise Learning Management System (LMS).
 *
 * This operation stores a new guest user record with required information such
 * as tenant affiliation, unique email, password hash, names, and status. It
 * automatically generates a UUID for the user ID and timestamps for creation
 * and update.
 *
 * @param props - Object containing the authenticated guest payload and the
 *   create request body
 * @param props.guest - The authenticated guest user context
 * @param props.body - The information required to create a new guest user
 * @returns The created guest user entity with all system fields populated
 * @throws {Error} Throws when database insertion fails due to constraint or
 *   data integrity violations
 */
export async function postenterpriseLmsGuestGuests(props: {
  guest: GuestPayload;
  body: IEnterpriseLmsGuest.ICreate;
}): Promise<IEnterpriseLmsGuest> {
  const { guest, body } = props;
  const created = await MyGlobal.prisma.enterprise_lms_guest.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      tenant_id: body.tenant_id,
      email: body.email,
      password_hash: body.password_hash,
      first_name: body.first_name,
      last_name: body.last_name,
      status: body.status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    email: created.email,
    password_hash: created.password_hash,
    first_name: created.first_name,
    last_name: created.last_name,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
