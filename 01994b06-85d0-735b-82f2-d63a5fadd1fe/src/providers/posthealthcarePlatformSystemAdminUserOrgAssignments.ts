import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new user-organization assignment
 * (healthcare_platform_user_org_assignments).
 *
 * This endpoint allows a system administrator to provision a new assignment
 * record linking a user to an organization with a specified role and assignment
 * status. Ensures referenced users and organizations exist and enforces
 * uniqueness of assignments. Performs all business validations required for
 * auditability, RBAC onboarding, and compliance.
 *
 * @param props - Object containing the system administrator (props.systemAdmin)
 *   and the assignment creation data (props.body)
 * @param props.systemAdmin - Authenticated system administrator payload
 * @param props.body - Assignment create DTO
 * @returns The newly created user-organization assignment record
 * @throws {Error} If the user does not exist, organization not found, or
 *   assignment already exists
 */
export async function posthealthcarePlatformSystemAdminUserOrgAssignments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserOrgAssignment.ICreate;
}): Promise<IHealthcarePlatformUserOrgAssignment> {
  const { body } = props;

  // Step 1: Ensure no duplicate assignment exists
  const prevAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: body.user_id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
      },
    });
  if (prevAssignment) {
    throw new Error("Duplicate user-organization assignment detected");
  }

  // Step 2: Validate user exists (as a system admin or patient)
  // Extend this check as necessary for additional user types in the future
  const userInSystemadmins =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: body.user_id,
        deleted_at: null,
      },
    });
  const userInPatients =
    await MyGlobal.prisma.healthcare_platform_patients.findFirst({
      where: {
        id: body.user_id,
        deleted_at: null,
      },
    });
  if (!userInSystemadmins && !userInPatients) {
    throw new Error("Cannot assign user to organization: user not found");
  }

  // Step 3: Validate organization exists and is not deleted
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: body.healthcare_platform_organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org) {
    throw new Error(
      "Cannot assign user to organization: organization not found",
    );
  }

  // Step 4: Create the new assignment
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: body.user_id,
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        role_code: body.role_code,
        assignment_status: body.assignment_status,
        created_at: now,
        updated_at: now,
      },
    });

  // Step 5: Return the API DTO object
  return {
    id: created.id,
    user_id: created.user_id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    role_code: created.role_code,
    assignment_status: created.assignment_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
