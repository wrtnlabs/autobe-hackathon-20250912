import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new enumeration value in ats_recruitment_enums (systemAdmin only)
 *
 * This endpoint allows a system administrator to add a new standardized enum
 * value to the ats_recruitment_enums table. Each enum is uniquely defined by
 * (enum_type, enum_code), supports display labels and optional metadata, and is
 * referenced throughout ATS business logic for state/type definitions.
 *
 * Authorization: Only users with the systemAdmin role (SystemadminPayload) can
 * perform this operation. Duplicate (enum_type, enum_code) combinations (with
 * no deleted_at) are strictly forbidden and will result in an error.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated SystemadminPayload (must be present
 *   and have type "systemadmin")
 * @param props.body - Enum creation payload including enum_type, enum_code,
 *   label, and optional metadata
 * @returns The IAtsRecruitmentEnum object for the newly created value
 * @throws {Error} If (enum_type, enum_code) already exists as an active
 *   (deleted_at=null) record
 */
export async function postatsRecruitmentSystemAdminEnums(props: {
  systemAdmin: SystemadminPayload;
  body: IAtsRecruitmentEnum.ICreate;
}): Promise<IAtsRecruitmentEnum> {
  const { systemAdmin, body } = props;

  // Ensure only systemAdmin can access
  if (!systemAdmin || systemAdmin.type !== "systemadmin") {
    throw new Error("Unauthorized: Only system admins can create enums");
  }

  // Check for active duplicate
  const duplicate = await MyGlobal.prisma.ats_recruitment_enums.findFirst({
    where: {
      enum_type: body.enum_type,
      enum_code: body.enum_code,
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new Error("Duplicate enum_type and enum_code for active enum");
  }

  // Current timestamp
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.ats_recruitment_enums.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      enum_type: body.enum_type,
      enum_code: body.enum_code,
      label: body.label,
      extended_data: body.extended_data ?? null,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    enum_type: created.enum_type,
    enum_code: created.enum_code,
    label: created.label,
    extended_data: created.extended_data ?? undefined,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
