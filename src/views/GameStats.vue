<template>
  <b-container fluid>
    <CurrentGameStats/>
    <TicketsStats/>
    <br>
    <PastGames/>
  </b-container>
</template>

<script>
import CurrentGameStats from '@/components/GameStats/CurrentGameStats';
import TicketsStats from '@/components/GameStats/TicketsStats';
import PastGames from '@/components/GameStats/PastGames';

export default {
  components: {
    CurrentGameStats,
    TicketsStats,
    PastGames,
  },
};
</script>

<style scoped>
  .card{
    text-align: center;
    margin: 20px;
  }
</style>
