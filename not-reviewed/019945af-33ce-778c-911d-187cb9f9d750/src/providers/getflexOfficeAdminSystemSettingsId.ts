import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a FlexOffice system setting by its unique
 * ID.
 *
 * This operation ensures that only authorized admin users can access the
 * configuration details.
 *
 * @param props - The properties containing the authenticated admin payload and
 *   the system setting ID.
 * @param props.admin - The authenticated admin user performing the request.
 * @param props.id - The unique identifier of the system setting (UUID v4
 *   format).
 * @returns The system setting details, including key, value, description, and
 *   audit timestamps.
 * @throws {Error} Throws if the system setting is not found or access is
 *   unauthorized.
 */
export async function getflexOfficeAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeSystemSettings> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.flex_office_system_settings.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    key: record.key,
    value: record.value ?? undefined,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
