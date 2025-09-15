import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { SpecialtycoffeelogCafesController } from "./controllers/specialtyCoffeeLog/cafes/SpecialtycoffeelogCafesController";
import { SpecialtycoffeelogMemberCafesController } from "./controllers/specialtyCoffeeLog/member/cafes/SpecialtycoffeelogMemberCafesController";
import { SpecialtycoffeelogMemberCafesCoffeelogsController } from "./controllers/specialtyCoffeeLog/member/cafes/coffeeLogs/SpecialtycoffeelogMemberCafesCoffeelogsController";
import { SpecialtycoffeelogMemberMembersCafesuggestionsController } from "./controllers/specialtyCoffeeLog/member/members/cafeSuggestions/SpecialtycoffeelogMemberMembersCafesuggestionsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    SpecialtycoffeelogCafesController,
    SpecialtycoffeelogMemberCafesController,
    SpecialtycoffeelogMemberCafesCoffeelogsController,
    SpecialtycoffeelogMemberMembersCafesuggestionsController,
  ],
})
export class MyModule {}
