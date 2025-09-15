import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentEnum";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get details of an enum value (ats_recruitment_enums table).
 *
 * Retrieves detailed information for a specific enumeration value in the ATS,
 * using the enum's unique UUID (enumId). Only available to systemAdmin users
 * due to business-critical reference nature. Returns enum_type (enum group),
 * enum_code, label, any extended data, description, and
 * creation/update/deletion history.
 *
 * Reference enums are used for core ATS workflows and business logic; only
 * authorized systemAdmin may access them. If no enum is found for the provided
 * enumId, an error is thrown.
 *
 * @param props - Object containing the systemAdmin payload and the UUID of the
 *   enum to retrieve
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the request
 * @param props.enumId - The unique identifier (UUID) of the ATS enum to
 *   retrieve
 * @returns IAtsRecruitmentEnum details for the requested enum
 * @throws {Error} If the enumId does not correspond to a live enum value (not
 *   found)
 */
export async function getatsRecruitmentSystemAdminEnumsEnumId(props: {
  systemAdmin: SystemadminPayload;
  enumId: string & tags.Format<"uuid">;
}): Promise<IAtsRecruitmentEnum> {
  const result = await MyGlobal.prisma.ats_recruitment_enums.findFirst({
    where: { id: props.enumId },
  });
  if (!result) throw new Error("Enum not found");

  return {
    id: result.id,
    enum_type: result.enum_type,
    enum_code: result.enum_code,
    label: result.label,
    extended_data: result.extended_data ?? undefined,
    description: result.description ?? undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    ...(result.deleted_at !== null &&
      result.deleted_at !== undefined && {
        deleted_at: toISOStringSafe(result.deleted_at),
      }),
  };
}
