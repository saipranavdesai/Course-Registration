insert into loginuser (role, stud_id, password_hash)
values ('student', 's0' , crypt('weakpassword', gen_salt('md5'))),
('student', 's1' , crypt('weakpassword', gen_salt('md5')));