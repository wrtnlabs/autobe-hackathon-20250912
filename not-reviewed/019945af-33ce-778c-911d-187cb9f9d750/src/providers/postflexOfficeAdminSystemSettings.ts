import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new FlexOffice system setting record.
 *
 * This operation creates a new system setting entry with a unique key, optional
 * value and description, and timestamps for auditing.
 *
 * Access control requires an authenticated admin user.
 *
 * @param props - Object containing authenticated admin and creation data
 * @param props.admin - Authenticated admin user payload
 * @param props.body - Data for the new system setting to create
 * @returns The newly created system setting including generated ID and
 *   timestamps
 * @throws {Error} If the unique key conflicts with existing entry
 */
export async function postflexOfficeAdminSystemSettings(props: {
  admin: AdminPayload;
  body: IFlexOfficeSystemSettings.ICreate;
}): Promise<IFlexOfficeSystemSettings> {
  const { body } = props;

  // Generate a new UUID for the system setting
  const id = v4() as string & tags.Format<"uuid">;

  // Current timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Insert the new system setting record into database
  const created = await MyGlobal.prisma.flex_office_system_settings.create({
    data: {
      id,
      key: body.key,
      value: body.value ?? null,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created record with datetime fields converted
  return {
    id: created.id,
    key: created.key,
    value: created.value ?? null,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
