Currenly running on queue.csc.kth.se

This is the new Queue application for KTH. 
Its task is to replace qwait.csc.kth.se.
It is still under development but it is running live as of September 2015.

Installation guide:
First of, local installs will work badly since the KTH-login system won't work
unless your ip is on the whitelist.

That being said, you can add a guest account as an admin by manipulating the
source-code or entering it in the database directly. There is a section in
app/model/queuesystem.js that has a setup part. If you uncomment setup and
comment out readin it will created fake simulated data for you. 
The guest login screen is hard-coded to add "guest-" in front of the chosen name.

The first thing that one needs to do is to install mongo and nodejs. After that
running npm install in the main folder should be all that is needed for the install. 
You might have to setup the accecs on the .npm folder depending on what distro you run.

To start the application just run "npm start" and the go to http://localhost:8080

