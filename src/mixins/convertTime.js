export default {
    methods: {
        dtToISO(input) {
            // Split the input string into date and time components
      
            let [dateStr, timeStr] = input.toString().split(" ");
      
            // Split the date components into month, day, and year
            const [month, day, year] = dateStr.split("/");
      
            // Split the time components into hour, minute, second, and millisecond
            const [hour, minute, secondAndMillisecond] = timeStr.split(":");
            const [second, millisecond] = secondAndMillisecond.split(".");
      
            // Create a new Date object using the components
            console.log(year);
            const buildDate = new Date(
              year,
              month - 1,
              day,
              Number(hour), //+ this.usaTimezones[this.timezoneOffset],
              minute,
              second,
              millisecond * 100
            );
            console.log("DAY:" + day);
            console.log(buildDate.toISOString());
            console.log("offset: ");
            console.log(buildDate.toTimeString());
      
            // Return the ISO timestamp representation of the Date object
            return buildDate.toISOString();
          },
          createTimestampDate(timestamp, timeOnly = false) {
            if (timeOnly) {
              const [hours, minutes, seconds] = timestamp.split(/[:\.]/);
              const date = new Date();
              date.setFullYear(1970);
              date.setMonth(1);
              date.setDate(1);
              date.setHours(parseInt(hours, 10));
              date.setMinutes(parseInt(minutes, 10));
              date.setSeconds(parseInt(seconds, 10));
              return date;
            } else {
              const timestampSeconds = Math.floor(timestamp / 10);
              const timestampMilliseconds = (timestamp % 10) * 100;
              const date = new Date(
                1970,
                0,
                1,
                0,
                0,
                timestampSeconds,
                timestampMilliseconds
              );
              return date;
            }
          },
      
          convertTimestamp(ts) {
            console.log("ts: " + ts);
            let iso_ts;
            let inputDate;
            const convertedTimeFormats = {};
            const epochRegex = /^\d{2}\d{2}\d{2}\d{3}\d{1,3}$/;//   /^\d+(\.\d+)?$/;
            const timestampOnlyRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\.\d$/;
            const dateTimeRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):\d{2}:\d{2}\.\d*/;
            const secondEpochTimestampRegex = /^\d+\.\d{2}$/;
            // Check if the input is in epoch timestamp or locale string or just time
            if (epochRegex.test(ts)) {
              inputDate = this.createTimestampDate(ts);
              convertedTimeFormats.new = true;
              convertedTimeFormats.calculatable = true;
              console.log("EPOCH MS TIME DETECTED")
            } else if (secondEpochTimestampRegex.test(ts)){
                inputDate = new Date(ts *100)
                console.log("EPOCH SECONDS TIME DETECTED")
                convertedTimeFormats.new = true; //don't show the date that is set to 1/1/1970
                convertedTimeFormats.calculatable = true;
            }
            else if (timestampOnlyRegex.test(ts)) {
              console.log("TIME ONLY FORMAT DETECTED");
              inputDate = this.createTimestampDate(ts, true);
              convertedTimeFormats.new = true; //false will not show the 1/1/1970 day
              convertedTimeFormats.calculatable = true;
              console.log(inputDate)
            } else if (dateTimeRegex.test(ts)){
              console.log("DATE TIME FORMAT DETECTED");
              iso_ts = this.dtToISO(ts);
              console.log("iso_ts: " + iso_ts);
              inputDate = new Date(iso_ts);
              convertedTimeFormats.new = true;
              convertedTimeFormats.calculatable = true;
              console.log(inputDate)
            }  else {
              console.log(ts+" NO FORMAT DETECTED");
              convertedTimeFormats.new = false;  
              convertedTimeFormats.calculatable = false;
            }
            
            // Convert the date to a human-readable format
         
            console.log("input date in ConvertTimestamp: " + inputDate);
            const options = {
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              fractionalSecondDigits: 2,
            };
            const locale = navigator.language;
            if(convertedTimeFormats.new){
                this.humanDate = inputDate.toLocaleDateString(undefined, options);
                convertedTimeFormats.humanReadable = String(this.humanDate);
                convertedTimeFormats.dateObj = inputDate;
                convertedTimeFormats.secFromEpoch = inputDate.getTime() / 100;

            }
      
            
            convertedTimeFormats.OGtimestamp = ts;
            //convertedTimeFormats.ISOtimestamp = this.dtToISO(ts); //to fix if needed
          
            
            console.log(
              "humanDate" + this.humanDate + "timezone: " + this.timezoneOffset +" / "+convertedTimeFormats.secFromEpoch
            );

            return convertedTimeFormats;
          },
          
          formatDate(inputDateTime) {
            let date;
            const reDateTime = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2}\.\d$/;
            const reTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/;
      
            // Use .test() to check if the string matches the pattern
      
            // Check if the input is in ISO timestamp format
            if (reTimestamp.test(inputDateTime)) {
              date = new Date(inputDateTime);
            } else if (reDateTime.test(inputDateTime)) {
              date = new Date(
                input.replace(/(\d{2})\/(\d{2})\/(\d{2})/, "20$3-$1-$2")
              );
            } else {
              console.log("not able to process Date");
            }
      
            const days = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const dayOfWeek = days[date.getDay()];
      
            // Formatting the date
            const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
              .toString()
              .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      
            // Formatting the time
            const formattedTime = `${date
              .getHours()
              .toString()
              .padStart(2, "0")}:${date
              .getMinutes()
              .toString()
              .padStart(2, "0")}:${date
              .getSeconds()
              .toString()
              .padStart(2, "0")}.${date
              .getMilliseconds()
              .toString()
              .padStart(3, "0")}`;
      
            return `${dayOfWeek}, ${formattedDate} ${formattedTime}`;
          },
    }
}