SELECT (password_hash = crypt('password', password_hash)) AS pswmatch 
FROM loginuser 
WHERE admin_id = 'a0';