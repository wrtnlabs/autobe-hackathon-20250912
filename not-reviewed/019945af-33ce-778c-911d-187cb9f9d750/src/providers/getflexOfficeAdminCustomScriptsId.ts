import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get single FlexOffice custom script details by ID
 *
 * This operation retrieves detailed information of a specific FlexOffice custom
 * script identified by its unique ID. The target record resides in the
 * flex_office_custom_scripts table, storing independently managed programmable
 * scripts with properties such as business code, name, language, description,
 * and source content.
 *
 * Authorized users with the admin role may access this information securely. If
 * the script is not found, an error is thrown.
 *
 * @param props - Object containing the admin payload and script id
 * @param props.admin - The authenticated admin user making the request
 * @param props.id - Unique identifier of the custom script
 * @returns Detailed information of the FlexOffice custom script
 * @throws {Error} When the custom script is not found
 */
export async function getflexOfficeAdminCustomScriptsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeCustomScript> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.flex_office_custom_scripts.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description ?? undefined,
    script_language: record.script_language,
    script_content: record.script_content,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
