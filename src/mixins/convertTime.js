import { DateTime } from 'luxon';
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
         
            const buildDate = new Date(
              year,
              month - 1,
              day,
              Number(hour), //+ this.usaTimezones[this.timezoneOffset],
              minute,
              second,
              millisecond * 100
            );
      
      
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
          createDateTimeFromTime(timeString) {

            const [timePart, centisecondsPart] = timeString.split('.');
            const [minutes, seconds] = timePart.split(':').map(Number);
          
            // Convert hours and minutes to seconds
            //const hoursInSeconds = hours * 3600;
            //const minutesInSeconds = minutes * 60;
          
            // Convert centiseconds to seconds
            const centiSeconds = Number(centisecondsPart) * 100;
         

            // Get the current date
            const currentDate = DateTime.local(2000,1,1).toFormat("yyyy-MM-dd");
        
            // Combine the current date with the provided time
            const dateTimeString = `${currentDate} ${timeString}`;
        
            // Create DateTime object from the combined string
            //const dateTime = DateTime.fromFormat(dateTimeString, "yyyy-MM-dd HH:mm.S");

            const dateTime  = DateTime.fromObject({ year: 2000, month: 1, day: 1, hour: 1, minute: minutes, second: seconds, millisecond: centiSeconds});
        
            return dateTime.toISO();
        },
        // https://moment.github.io/luxon/demo/global.html
          convertTimestamp(ts,tz=NaN) {
   
            let iso_ts;
            let inputDate;
            let luxonInputDate;

            var rezoned = DateTime.local().setZone("America/Los_Angeles");
            const timeWithMilliseconds = DateTime.toLocaleString({
              weekday: 'short',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              millisecond: 'numeric',
              hour12: true,
              year: 'numeric'
            });
            let descriptiveDateTimeFormat = {...DateTime.DATETIME_FULL_WITH_SECONDS, weekday: 'short', month:'short',millisecond: 'numeric' };
            const convertedTimeFormats = {};
            const epochRegex = /^\d{2}\d{2}\d{2}\d{3}\d{1,3}$/;//   /^\d+(\.\d+)?$/;
            const timestampOnlyRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\.\d$/;
            const dateTimeRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):\d{2}:\d{2}\.\d*/;
            const secondEpochTimestampRegex = /^\d+\.\d{2}$/;
            // Check if the input is in epoch timestamp or locale string or just time
            if (epochRegex.test(ts)) {
              inputDate = this.createTimestampDate(ts);
              //console.log("CHECK: "+ts)
              luxonInputDate = DateTime.fromMillis(Number(ts)*100).toISO();

              //console.log("luxon date"+luxonInputDate.toString(DateTime.DATETIME_FULL))
              convertedTimeFormats.new = true;
              convertedTimeFormats.calculatable = true;
              console.log("EPOCH MS TIME DETECTED")
            } else if (timestampOnlyRegex.test(ts)){
              console.log(ts+" Timestamp Only DETECTED");
              luxonInputDate = this.createDateTimeFromTime(ts);//DateTime.fromFormat(ts.toString(),"HH:mm.s").toLocaleString(DateTime.TIME_SIMPLE); //try catch?
              
              convertedTimeFormats.new = true;  
              convertedTimeFormats.calculatable = true;
            } 
            else if (dateTimeRegex.test(ts)){
              //console.log(ts+" M/D/YYYY HH:MM:SS.ms DETECTED");
              luxonInputDate = DateTime.fromFormat(ts, "M/d/yyyy HH:mm:ss.S").toISO();//DateTime.fromFormat(ts.toString(),"HH:mm.s").toLocaleString(DateTime.TIME_SIMPLE); //try catch?
              
              convertedTimeFormats.new = true;  
              convertedTimeFormats.calculatable = true;
            } 
            else if (DateTime.fromISO(ts).isValid){
               //console.log(ts+" ISO Format DETECTED");
              luxonInputDate = ts;
              
              convertedTimeFormats.new = true;  
              convertedTimeFormats.calculatable = true;

            }
          else {
              //console.log(ts+" NO FORMAT DETECTED");
              luxonInputDate = DateTime.fromISO(ts).toLocaleString(DateTime.TIME_SIMPLE); //try catch?
              convertedTimeFormats.new = false;  
              convertedTimeFormats.calculatable = false;
            }
            
            // Convert the date to a human-readable format
         
            //console.log("input date in ConvertTimestamp: " + inputDate);
            //console.log("input date in Luxor ConvertTimestamp: " + luxonInputDate.toLocaleString(DateTime.DATETIME_FULL));
            const options = {
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
              fractionalSecondDigits: 3,
            };

            const locale = navigator.language;

            
            if(convertedTimeFormats.new){
                //this.humanDate = inputDate.toLocaleDateString(DateTime.DATETIME_FULL);
           

                const customFormat = "ccc, MMM d yyyy h:mm:ss.S a";

                // Format the DateTime object
                convertedTimeFormats.humanReadable = DateTime.fromISO(luxonInputDate).toFormat(customFormat);
                //convertedTimeFormats.humanReadable = String(this.humanDate);
                convertedTimeFormats.dateObj = luxonInputDate; //inputDate;
                //console.log("Luxon: "+luxonInputDate + " Type: "+typeof(luxonInputDate))
                convertedTimeFormats.MillisecFromEpoch =  DateTime.fromISO(luxonInputDate).toMillis(); //inputDate.getTime() / 100;
                convertedTimeFormats.iso = luxonInputDate
                //console.log("TEST: "+convertedTimeFormats.humanReadable +" : " +convertedTimeFormats.iso);

                
                
            }
      
            
            convertedTimeFormats.OGtimestamp = ts;
            //convertedTimeFormats.ISOtimestamp = this.dtToISO(ts); //to fix if needed
          
            
         

            return convertedTimeFormats;
          },
          secondsBetweenISOEvents(ts1, ts2){
            const totalSeconds = DateTime.fromISO(ts2)
            .diff(DateTime.fromISO(ts1))
            .as("seconds");

            return totalSeconds
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