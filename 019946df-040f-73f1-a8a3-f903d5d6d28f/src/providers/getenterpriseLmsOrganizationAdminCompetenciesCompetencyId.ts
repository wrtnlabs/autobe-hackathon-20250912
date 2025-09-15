import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information of a competency by ID.
 *
 * This operation fetches a specific competency record from the
 * enterprise_lms_competencies table by its unique identifier. It excludes
 * soft-deleted records (deleted_at not null).
 *
 * The function requires an authenticated organizationAdmin with proper
 * tenant-level authorization to access competency details.
 *
 * @param props - Object containing authentication payload and competencyId path
 *   parameter
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.competencyId - Unique identifier of the competency to retrieve
 * @returns The competency record matching the given ID
 * @throws {Error} Throws if competency not found or soft deleted
 */
export async function getenterpriseLmsOrganizationAdminCompetenciesCompetencyId(props: {
  organizationAdmin: OrganizationadminPayload;
  competencyId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCompetencies> {
  const { organizationAdmin, competencyId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_competencies.findUniqueOrThrow({
      where: { id: competencyId, deleted_at: null },
    });

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
