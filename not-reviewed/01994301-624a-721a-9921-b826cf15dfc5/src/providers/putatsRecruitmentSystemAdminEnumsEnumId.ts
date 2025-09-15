import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing enumeration value in ats_recruitment_enums (systemAdmin
 * only)
 *
 * This operation updates the properties of a central enumeration code-value by
 * system id. Only the systemAdmin role is permitted to make such changes, as
 * enums affect core business workflows globally. The function enforces
 * uniqueness of (enum_type, enum_code) across active enums, supports partial
 * updates of label, description, extended_data, enum_type, and enum_code, and
 * throws clear errors on not found or duplication.
 *
 * @param props - Properties for the update operation.
 * @param props.systemAdmin - Authenticated system admin making the request
 *   (must be present).
 * @param props.enumId - UUID of the enumeration value to update.
 * @param props.body - Fields to update (any subset of enum_code, label,
 *   description, extended_data, enum_type)
 * @returns The updated IAtsRecruitmentEnum entry with all fields populated.
 * @throws {Error} If the enum value is not found or the (enum_type, enum_code)
 *   combination would not be unique.
 */
export async function putatsRecruitmentSystemAdminEnumsEnumId(props: {
  systemAdmin: SystemadminPayload;
  enumId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentEnum.IUpdate;
}): Promise<IAtsRecruitmentEnum> {
  // 1) Authorization: presence validated by system, only systemAdmin role
  // 2) Fetch current enum, ensure not deleted
  const existing = await MyGlobal.prisma.ats_recruitment_enums.findFirst({
    where: {
      id: props.enumId,
      deleted_at: null,
    },
  });
  if (!existing) {
    throw new Error("Enum not found");
  }
  // 3) If enum_type/enum_code changed, check uniqueness
  const updatingType =
    props.body.enum_type !== undefined &&
    props.body.enum_type !== existing.enum_type;
  const updatingCode =
    props.body.enum_code !== undefined &&
    props.body.enum_code !== existing.enum_code;
  const finalEnumType = updatingType
    ? props.body.enum_type!
    : existing.enum_type;
  const finalEnumCode = updatingCode
    ? props.body.enum_code!
    : existing.enum_code;
  if (updatingType || updatingCode) {
    const duplicate = await MyGlobal.prisma.ats_recruitment_enums.findFirst({
      where: {
        enum_type: finalEnumType,
        enum_code: finalEnumCode,
        id: { not: props.enumId },
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new Error("Duplicate enum_type/enum_code");
    }
  }
  // 4) Build update data - only set fields if in body; always update timestamp
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.ats_recruitment_enums.update({
    where: { id: props.enumId },
    data: {
      ...(props.body.enum_type !== undefined
        ? { enum_type: props.body.enum_type }
        : {}),
      ...(props.body.enum_code !== undefined
        ? { enum_code: props.body.enum_code }
        : {}),
      ...(props.body.label !== undefined ? { label: props.body.label } : {}),
      ...(props.body.extended_data !== undefined
        ? { extended_data: props.body.extended_data }
        : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      updated_at: now,
    },
  });
  // 5) Return full IAtsRecruitmentEnum with all correct typings
  return {
    id: updated.id,
    enum_type: updated.enum_type,
    enum_code: updated.enum_code,
    label: updated.label,
    extended_data:
      updated.extended_data === null
        ? null
        : (updated.extended_data ?? undefined),
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "object" && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
