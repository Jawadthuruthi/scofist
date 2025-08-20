"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User, Trophy, Target, Filter, X } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import { debounce } from "lodash";

const ParticipantCard = ({ participant, programs, divisions }) => {
  // Get participant's primary division
  const primaryDivision = divisions?.find(
    (div) => div._id === participant.divisionId && div.type === "Primary"
  );

  // Get secondary divisions that include this primary division
  const secondaryDivisions = divisions?.filter(
    (div) =>
      div.type === "Secondary" &&
      div.subDivisions?.includes(participant.divisionId)
  );

  // Get programs for primary division
  const primaryPrograms = programs?.filter(
    (prog) => prog.divisionId === participant.divisionId
  );

  // Get programs for secondary divisions
  const secondaryPrograms = programs?.filter((prog) =>
    secondaryDivisions?.some((div) => div._id === prog.divisionId)
  );

  // Get participant's registered programs
  const participantPrograms = participant.programs || [];

  const getProgramStatus = (programId) => {
    const participantProgram = participantPrograms.find(
      (p) => p.id === programId
    );
    if (participantProgram) {
      if (participantProgram.rank > 0) {
        return {
          status: "completed",
          rank: participantProgram.rank,
          points: participantProgram.points,
        };
      }
      return { status: "registered" };
    }
    return { status: "available" };
  };

  const getStatusBadge = (status, rank, points) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="text-xs">
            Rank {rank} ({points} pts)
          </Badge>
        );
      case "registered":
        return (
          <Badge variant="secondary" className="text-xs">
            Registered
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Available
          </Badge>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">
            #{participant.chestNumber}
          </div>
          <Badge variant="outline" className="text-sm">
            {participant.teamName}
          </Badge>
        </div>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" />
          {participant.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Division */}
        {primaryDivision && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">
                {primaryDivision.name} (Primary)
              </h4>
            </div>
            <div className="space-y-1 ml-6">
              {primaryPrograms?.length > 0 ? (
                primaryPrograms.map((program) => {
                  const { status, rank, points } = getProgramStatus(
                    program._id
                  );
                  return (
                    <div
                      key={program._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate mr-2">{program.name}</span>
                      {getStatusBadge(status, rank, points)}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground ml-0">
                  No programs available
                </p>
              )}
            </div>
          </div>
        )}

        {/* Secondary Divisions */}
        {secondaryDivisions?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-secondary" />
              <h4 className="font-semibold text-sm">Secondary Divisions</h4>
            </div>
            <div className="space-y-3 ml-6">
              {secondaryDivisions.map((division) => {
                const divisionPrograms = secondaryPrograms?.filter(
                  (prog) => prog.divisionId === division._id
                );
                return (
                  <div key={division._id}>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">
                      {division.name}
                    </h5>
                    <div className="space-y-1">
                      {divisionPrograms?.length > 0 ? (
                        divisionPrograms.map((program) => {
                          const { status, rank, points } = getProgramStatus(
                            program._id
                          );
                          return (
                            <div
                              key={program._id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate mr-2 text-xs">
                                {program.name}
                              </span>
                              {getStatusBadge(status, rank, points)}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No programs available
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Total Points */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Total Points:</span>
            <Badge variant="default">{participant.totalPoints || 0} pts</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ParticipantsCard = ({ apiKey, filterConfig, readOnly = false }) => {
  const [participants, setParticipants] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 20;

  const { useFetchItems } = useCrud("participants", apiKey);
  const { useFetchItems: useFetchPrograms } = useCrud("programs", apiKey);
  const { useFetchItems: useFetchDivisions } = useCrud("divisions", apiKey);

  // Build API filters
  const apiFilters = useMemo(() => {
    const combinedFilters = { ...filters };
    if (searchQuery) {
      combinedFilters.name = searchQuery;
    }
    return combinedFilters;
  }, [filters, searchQuery]);

  // Fetch data
  const participantsQuery = useFetchItems(page, limit, apiFilters);
  const programsQuery = useFetchPrograms(0, Infinity, {});
  const divisionsQuery = useFetchDivisions(0, Infinity, {});

  // Handle participants data
  useEffect(() => {
    if (participantsQuery.data) {
      const newParticipants = participantsQuery.data.participants || [];
      const pagination = participantsQuery.data?.pagination || {};

      if (page === 0) {
        setParticipants(newParticipants);
      } else {
        setParticipants((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const uniqueNewItems = newParticipants.filter(
            (item) => !existingIds.has(item._id)
          );
          return [...prev, ...uniqueNewItems];
        });
      }

      setHasNextPage(page < (pagination?.totalPages || 1) - 1);
    }
  }, [participantsQuery.data, page]);

  // Handle programs data
  useEffect(() => {
    if (programsQuery.data) {
      setPrograms(programsQuery.data.programs || []);
    }
  }, [programsQuery.data]);

  // Handle divisions data
  useEffect(() => {
    if (divisionsQuery.data) {
      setDivisions(divisionsQuery.data.divisions || []);
    }
  }, [divisionsQuery.data]);

  // Handle errors
  useEffect(() => {
    if (participantsQuery.error) {
      toast.error(
        participantsQuery.error.message || "Failed to fetch participants"
      );
    }
  }, [participantsQuery.error]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
      setPage(0);
      setParticipants([]);
    }, 300),
    []
  );

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0);
    setParticipants([]);
  };

  const handleSearchChange = (value) => {
    debouncedSearch(value);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setPage(0);
    setParticipants([]);
  };

  const loadMore = () => {
    if (hasNextPage && !participantsQuery.isLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const hasActiveFilters =
    Object.keys(filters).some((key) => filters[key]) || searchQuery;

  const isLoading = participantsQuery.isLoading && page === 0;
  const isLoadingMore = participantsQuery.isLoading && page > 0;

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Enter participant name"
                  className="pl-10"
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Filters */}
            {filterConfig.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <Label htmlFor={filter.id}>{filter.label}</Label>
                {filter.inputType === "select" ? (
                  <Select
                    value={filters[filter.id] || ""}
                    onValueChange={(value) =>
                      handleFilterChange(filter.id, value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={`Select ${filter.label.toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All {filter.label}s</SelectItem>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={filter.id}
                    type={filter.inputType}
                    placeholder={filter.placeholder}
                    value={filters[filter.id] || ""}
                    onChange={(e) =>
                      handleFilterChange(filter.id, e.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Participants ({participants.length}
            {hasNextPage && "+"})
          </h3>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array(8)
              .fill(0)
              .map((_, index) => (
                <Card key={index} className="w-full max-w-md mx-auto">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : participants.length > 0 ? (
          <>
            {/* Participant Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant._id}
                  participant={participant}
                  programs={programs}
                  divisions={divisions}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  variant="outline"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        ) : (
          // No Results
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Participants Found
              </h3>
              <p className="text-muted-foreground text-center">
                {hasActiveFilters
                  ? "No participants match your current filters. Try adjusting your search criteria."
                  : "No participants are currently available."}
              </p>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ParticipantsCard;
