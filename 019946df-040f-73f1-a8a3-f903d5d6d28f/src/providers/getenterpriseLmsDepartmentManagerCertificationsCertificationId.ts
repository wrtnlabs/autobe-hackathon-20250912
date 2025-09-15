import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCertification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCertification";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Retrieve detailed information about a single certification by its unique ID
 * within the enterprise LMS tenant context. Only accessible by users with
 * departmentManager role.
 *
 * The function performs tenant isolation by confirming the certification
 * belongs to the departmentManager's tenant.
 *
 * @param props - Object containing departmentManager payload and
 *   certificationId path parameter
 * @param props.departmentManager - The authorized department manager payload
 * @param props.certificationId - Unique identifier of the certification
 * @returns The detailed certification information
 * @throws {Error} Throws error if departmentManager or certification does not
 *   exist or unauthorized access
 */
export async function getenterpriseLmsDepartmentManagerCertificationsCertificationId(props: {
  departmentManager: DepartmentmanagerPayload;
  certificationId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCertification> {
  const { departmentManager, certificationId } = props;

  // Fetch departmentManager from DB to get tenant_id. Enforce active status and not deleted
  const dbDepartmentManager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirstOrThrow({
      where: {
        id: departmentManager.id,
        status: "active",
        deleted_at: null,
      },
    });

  // Fetch certification ensuring tenant isolation and soft delete filter
  const certification =
    await MyGlobal.prisma.enterprise_lms_certifications.findFirstOrThrow({
      where: {
        id: certificationId,
        tenant_id: dbDepartmentManager.tenant_id,
        deleted_at: null,
      },
    });

  return {
    id: certification.id,
    tenant_id: certification.tenant_id,
    code: certification.code,
    name: certification.name,
    description: certification.description ?? null,
    status: certification.status,
    created_at: toISOStringSafe(certification.created_at),
    updated_at: toISOStringSafe(certification.updated_at),
    deleted_at: certification.deleted_at
      ? toISOStringSafe(certification.deleted_at)
      : null,
  };
}
