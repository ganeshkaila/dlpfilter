# dlpfilter

## READY:
#### Things to remember:
1. It is assumed that your running the commands inside `dlpfilter/` directory.
2. The output/result log messages will apprear under ***GCE VM Instance, dlpfilter-tool > dlpfilter*** in stackdriver logging account.

#### For new applications,
1. Sending the original and filtered log messages.
    Command#1:

       $ node app.js
       
    > The above command will print the hardcoded text string to stackdriver logging and console stdout.
    
#### For existing applications,
1. Existing log messages from the application log files
    Command#1:

        $ node dlpfilter.js stackdriver-logging files \
            -f resources/file1.txt resources/file2.txt \
            -t EMAIL_ADDRESS
            
    > The above command will print the text strings inside the files to stackdriver logging while redacting only email address.
    
   Command#2:

        $ node dlpfilter.js stackdriver-logging files \
            -f resources/file1.txt resources/file2.txt \
            -t EMAIL_ADDRESS PHONE_NUMBER
            
    > The above command will print the text strings inside the files to stackdriver logging while redacting both email addressa and phone number.

2. Streaming log messages from the application log files
    Command#1:

        $ node dlpfilter.js stackdriver-logging files \
            -f resources/file1.txt resources/file2.txt \
            -t EMAIL_ADDRESS
            
    > The above command will print the text strings inside the files to stackdriver logging while redacting only email address.
    
    Now, Open another console session and try to send stream some message to file1.txt file
    
        $ echo "My phone number is (223) 456-7890 and my email address is gary@somedomain.com." >> resources/file1.txt
    
    > Now, you can see streamed log message under console output as well as stackdriver logging.

3. Existing log messages from a particular log name in the stackdriver logging
    Command#1:

        $ node dlpfilter.js stackdriver-logging logs -l my-test-log -t EMAIL_ADDRESS
            
    > The above command will read the log messages from another stackdriver logging (my-test-log) to our stackdriver logging (dlpfilter). You can check the `my-test-log` logging name under ***Global***

## TODO:
For already developed projects,

1. Streaming log messages from a particular log name in the stackdriver logging.
2. Existing log messages from the log files stored in the GCS bucket
