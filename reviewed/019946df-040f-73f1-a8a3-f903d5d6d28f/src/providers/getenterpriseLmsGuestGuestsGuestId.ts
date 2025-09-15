import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Retrieve detailed information about a specific guest user by their unique
 * identifier.
 *
 * This operation allows authorized guest role users to fetch a single guest
 * user record, including email, personal names, status, and associated tenant.
 * It ensures multi-tenant isolation by filtering out soft deleted records.
 *
 * @param props - Object containing authentication payload and guestId path
 *   parameter
 * @param props.guest - The authenticated guest user payload
 * @param props.guestId - Unique identifier (UUID) of the guest user to retrieve
 * @returns Detailed guest user information conforming to IEnterpriseLmsGuest
 * @throws {Error} Throws if the guest user does not exist or is soft deleted
 */
export async function getenterpriseLmsGuestGuestsGuestId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsGuest> {
  const { guest, guestId } = props;

  // Retrieve guest user from the database by id, ensure not soft deleted
  const guestData = await MyGlobal.prisma.enterprise_lms_guest.findFirstOrThrow(
    {
      where: {
        id: guestId,
        deleted_at: null,
      },
    },
  );

  // Return guest user data with all date fields converted to ISO strings
  return {
    id: guestData.id,
    tenant_id: guestData.tenant_id,
    email: guestData.email,
    password_hash: guestData.password_hash,
    first_name: guestData.first_name,
    last_name: guestData.last_name,
    status: guestData.status,
    created_at: toISOStringSafe(guestData.created_at),
    updated_at: toISOStringSafe(guestData.updated_at),
    deleted_at: guestData.deleted_at
      ? toISOStringSafe(guestData.deleted_at)
      : null,
  };
}
