import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeSystemSettings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing FlexOffice system setting identified by ID.
 *
 * Allows modifying configuration key, value, and description.
 *
 * Admin permissions required.
 *
 * Returns updated system setting with the latest data and timestamps.
 *
 * @param props - Properties including admin auth, id of setting, and update
 *   body
 * @returns The updated system setting record
 * @throws {Error} If the key provided already exists in another setting
 */
export async function putflexOfficeAdminSystemSettingsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IFlexOfficeSystemSettings.IUpdate;
}): Promise<IFlexOfficeSystemSettings> {
  const { admin, id, body } = props;

  // Check duplicate key if key is provided
  if (body.key !== undefined && body.key !== null) {
    const duplicate =
      await MyGlobal.prisma.flex_office_system_settings.findFirst({
        where: {
          key: body.key,
          NOT: { id },
        },
      });
    if (duplicate) throw new Error("Duplicate key");
  }

  // Set updated_at to current timestamp
  const now = toISOStringSafe(new Date());

  // Prepare update data with nullable support
  const updateData = {
    key: body.key ?? undefined,
    value: body.value === undefined ? undefined : body.value,
    description: body.description === undefined ? undefined : body.description,
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.flex_office_system_settings.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value === null ? null : updated.value,
    description: updated.description === null ? null : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
