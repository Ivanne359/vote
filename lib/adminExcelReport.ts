import * as XLSX from "xlsx";
import { ELECTION_POSITIONS, type CandidateRecord, type ElectionSettings } from "@/lib/adminRealtime";

type ReportContext = {
  candidates: CandidateRecord[];
  candidateVotes: Record<string, number>;
  electionSettings?: ElectionSettings | null;
};

type RankedCandidate = {
  rank: number;
  name: string;
  votes: number;
  isWinner: boolean;
};

const applySheetLayout = (
  sheet: XLSX.WorkSheet,
  widths: number[],
): void => {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as XLSX.Range;
};

const getWinnerSlots = (position: string): number => {
  const match = position.match(/\(\s*Select\s+(\d+)\s*\)/i);
  if (!match) return 1;
  const slots = Number(match[1]);
  return Number.isFinite(slots) && slots > 0 ? slots : 1;
};

const rankCandidates = (
  candidates: CandidateRecord[],
  candidateVotes: Record<string, number>,
): RankedCandidate[] => {
  const sorted = candidates
    .map((candidate) => ({
      name: candidate.name,
      votes: candidateVotes[candidate.id] ?? 0,
    }))
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name);
    });

  let currentRank = 0;
  let previousVotes: number | null = null;

  return sorted.map((candidate, index) => {
    if (previousVotes === null || candidate.votes < previousVotes) {
      currentRank = index + 1;
      previousVotes = candidate.votes;
    }

    return {
      rank: currentRank,
      name: candidate.name,
      votes: candidate.votes,
      isWinner: false,
    };
  });
};

const buildReportRows = ({ candidates, candidateVotes }: ReportContext) => {
  const detailedRows: Array<{
    Position: string;
    Rank: number | string;
    Candidate: string;
    "Vote Count": number;
    Winner: string;
  }> = [];

  const winnerSummaryRows: Array<{
    Position: string;
    Winners: string;
    "Winning Votes": string;
  }> = [];

  ELECTION_POSITIONS.forEach((position) => {
    const candidatesForPosition = candidates.filter((candidate) => candidate.position === position);
    if (candidatesForPosition.length === 0) {
      detailedRows.push({
        Position: position,
        Rank: "-",
        Candidate: "No candidate",
        "Vote Count": 0,
        Winner: "No",
      });
      winnerSummaryRows.push({
        Position: position,
        Winners: "No candidate",
        "Winning Votes": "0",
      });
      return;
    }

    const slots = getWinnerSlots(position);
    const ranked = rankCandidates(candidatesForPosition, candidateVotes);

    const winners = ranked
      .filter((candidate) => candidate.rank <= slots)
      .map((candidate) => ({ ...candidate, isWinner: true }));

    ranked.forEach((candidate) => {
      detailedRows.push({
        Position: position,
        Rank: candidate.rank,
        Candidate: candidate.name,
        "Vote Count": candidate.votes,
        Winner: candidate.rank <= slots ? "Yes" : "No",
      });
    });

    winnerSummaryRows.push({
      Position: position,
      Winners: winners.map((winner) => winner.name).join(", ") || "No winner",
      "Winning Votes": winners.map((winner) => String(winner.votes)).join(", ") || "0",
    });
  });

  return { detailedRows, winnerSummaryRows };
};

export const downloadElectionResultsExcel = ({
  candidates,
  candidateVotes,
  electionSettings,
}: ReportContext): string => {
  const generatedAt = new Date();
  const timestamp = generatedAt.toISOString().replace(/[:.]/g, "-");

  const { detailedRows, winnerSummaryRows } = buildReportRows({
    candidates,
    candidateVotes,
    electionSettings,
  });

  const summaryRows = [
    {
      Field: "Generated At",
      Value: generatedAt.toLocaleString(),
    },
    {
      Field: "Election Window",
      Value: electionSettings
        ? `${electionSettings.startDate} ${electionSettings.startTime} - ${electionSettings.endDate} ${electionSettings.endTime}`
        : "Not available",
    },
    {
      Field: "Voting Status",
      Value: electionSettings?.isActive ? "OPEN" : "CLOSED",
    },
    {
      Field: "Total Candidates",
      Value: String(candidates.length),
    },
  ];

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  applySheetLayout(summarySheet, [24, 64]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const winnersSheet = XLSX.utils.json_to_sheet(winnerSummaryRows);
  applySheetLayout(winnersSheet, [34, 52, 18]);
  XLSX.utils.book_append_sheet(workbook, winnersSheet, "Winners");

  const detailedSheet = XLSX.utils.json_to_sheet(detailedRows);
  applySheetLayout(detailedSheet, [34, 8, 34, 14, 12]);
  XLSX.utils.book_append_sheet(workbook, detailedSheet, "Rankings");

  const fileName = `election-results-${timestamp}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
};
