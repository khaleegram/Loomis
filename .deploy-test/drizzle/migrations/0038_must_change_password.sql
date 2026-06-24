ALTER TABLE identity.users
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE student.students
  ADD COLUMN user_id uuid REFERENCES identity.users(id);

CREATE UNIQUE INDEX students_user_id_unique ON student.students (user_id)
  WHERE user_id IS NOT NULL;
