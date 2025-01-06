import { format } from "date-fns";

export const formatDeadline = (date: string) => {
  const deadlineIsSameDay =
    new Date(date).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

  const deadlineText = deadlineIsSameDay
    ? format(date, "HH:mm") // today
    : `${format(date, "dd MMMM yyyy")} || _${format(date, "HH:mm")}_`;

  return deadlineText;
};
