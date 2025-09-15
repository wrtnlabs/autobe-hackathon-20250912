import { Module } from "@nestjs/common";

import { AuthDiaryuserController } from "./controllers/auth/diaryUser/AuthDiaryuserController";
import { MooddiaryDiaryuserMoodentriesController } from "./controllers/moodDiary/diaryUser/moodEntries/MooddiaryDiaryuserMoodentriesController";

@Module({
  controllers: [
    AuthDiaryuserController,
    MooddiaryDiaryuserMoodentriesController,
  ],
})
export class MyModule {}
