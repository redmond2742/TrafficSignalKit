export default {
    methods: {

        /*
            input: date-time, time only, timestamp
            output: js object with the following:

                utcTimestamp(seconds):
                DisplayDateTime:
                original date:
                noDate (boolean):



            Sort input accordingly, based on Reg.Ex.

            

        */

        convertToISO(input) {
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
      
          convertTimestamp(ts, humanReadable = "true") {
            console.log("ts: " + ts);
            let iso_ts;
            let inputDate;
            const epochRegex = /^\d+(\.\d+)?$/;
            const timestampOnlyRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\.\d$/;
      
            // Check if the input is in epoch timestamp or locale string or just time
            if (epochRegex.test(ts)) {
              inputDate = this.createTimestampDate(ts);
            } else if (timestampOnlyRegex.test(ts)) {
              console.log("Valid time Only format");
              inputDate = this.createTimestampDate(ts, true);
            } else {
              console.log("running this.convertTimestamp else");
              iso_ts = this.convertToISO(ts);
              console.log("iso_ts: " + iso_ts);
              inputDate = new Date(iso_ts);
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
      
            this.humanDate = inputDate.toLocaleDateString(undefined, options);
            console.log(
              "humanDate" + this.humanDate + "timezone: " + this.timezoneOffset
            );
            if (humanReadable) {
              return this.humanDate;
            } else {
              return inputDate.getTime() / 100;
            }
          },
          parameterSwitch(e) {
            if (e < 24 || (e >= 41 && e < 60)) {
              return "Phase";
            } else if (e === 31) {
              return "Barrier";
            } else if (e >= 32 && e <= 33) {
              return "FYA";
            } else if (e >= 61 && e <= 80) {
              return "Overlap";
            } else if (e >= 81 && e <= 89) {
              return "Detector Channel";
            } else if (e >= 89 && e <= 100) {
              return "Pedestrian Detector";
            } else if (e >= 101 && e <= 111) {
              return "Preempt";
            } else if (e >= 112 && e <= 115) {
              return "TSP";
            } else if (e === 131) {
              return "Pattern";
            } else if (e >= 132 && e <= 133) {
              return "Seconds";
            } else if (e >= 134 && e <= 149) {
              return "New Split time in Seconds";
            } else if (e === 150) {
              return "Coordination State Change";
            } else if (e === 151) {
              return "Phase";
            } else {
              return "Channel";
            }
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