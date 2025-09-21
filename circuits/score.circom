pragma circom 2.1.6;

template SumBits(N){
  signal input bits[N];
  signal output sum;

  signal acc[N+1];
  acc[0] <== 0;
  for (var i=0;i<N;i++){
    bits[i] * (bits[i]-1) === 0;   // bits are boolean
    acc[i+1] <== acc[i] + bits[i];
  }
  sum <== acc[N];
}

template ScorePercent(N){
  signal input bits[N];    // private
  signal input n;          // public
  signal input autoScore;  // public
  signal output ok;        // public

  component s = SumBits(N);
  for (var i=0;i<N;i++) s.bits[i] <== bits[i];

  n === N;                       // enforce N
  autoScore * N === s.sum * 100; // exact integer equality (percent as integer)
  ok <== 1;
}

// expose 'n' and 'autoScore' as public inputs of main
component main {public [n, autoScore]} = ScorePercent(25);
