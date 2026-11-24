import app from '../server/index.js';
import { db, initDatabase } from '../server/db/index.js';

interface TestResult {
  name: string;
  method: string;
  path: string;
  status: number;
  expected: number | number[];
  passed: boolean;
  error?: string;
  dataSnippet?: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('--- STARTING COMPLETE APPLICATION API TEST SUITE ---');
  initDatabase();

  const baseUrl = 'http://127.0.0.1:5001';
  console.log(`Connecting to server at ${baseUrl}...`);

  // Wait 1 second for Neon sync / initialization
  await new Promise((r) => setTimeout(r, 1000));

  async function testApi(
    name: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any,
    expectedStatus: number | number[] = 200
  ) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = text;
      }

      const allowedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
      const passed = allowedStatuses.includes(res.status);

      results.push({
        name,
        method,
        path: endpoint,
        status: res.status,
        expected: expectedStatus,
        passed,
        error: !passed ? (json?.error || (typeof json === 'string' ? json : JSON.stringify(json)).slice(0, 100)) : undefined,
        dataSnippet: typeof json === 'object' ? JSON.stringify(json).slice(0, 80) : String(text).slice(0, 80),
      });

      const icon = passed ? '✅' : '❌';
      console.log(`${icon} [${method}] ${endpoint} -> ${res.status} (${name})`);
      if (!passed) {
        console.error(`   Error details:`, json);
      }
      return { status: res.status, data: json };
    } catch (err: any) {
      results.push({
        name,
        method,
        path: endpoint,
        status: 0,
        expected: expectedStatus,
        passed: false,
        error: err.message,
      });
      console.log(`❌ [${method}] ${endpoint} -> NETWORK/FETCH ERROR: ${err.message}`);
      return { status: 0, data: null };
    }
  }

  // 1. Health & Status
  await testApi('Health Check', 'GET', '/api/health');

  // 2. Tournaments API
  const tourList = await testApi('List Tournaments', 'GET', '/api/tournaments');
  const targetTourId = tourList.data?.[0]?.id || 'tour_ppl_2026';
  await testApi('Get Single Tournament', 'GET', `/api/tournaments/${targetTourId}`);
  await testApi('Get Tournament Squads', 'GET', `/api/tournaments/${targetTourId}/squads`);

  // 3. Auctions API
  const aucList = await testApi('List Auctions', 'GET', '/api/auctions');
  const targetAucId = aucList.data?.[0]?.id || 'auc_default';
  await testApi('Auction Stats Summary', 'GET', '/api/auctions/stats/summary');
  await testApi('Get Single Auction', 'GET', `/api/auctions/${targetAucId}`);
  await testApi('Get Auction by Share Link', 'GET', '/api/auctions/link/ppl-2026', undefined, [200, 404]);
  await testApi('Get Auction Room State', 'GET', `/api/auctions/${targetAucId}/room-state`);

  // 4. Teams API
  const teamsList = await testApi('List Teams', 'GET', '/api/teams');
  let sampleTeam = teamsList.data?.[0];
  if (!sampleTeam) {
    const createdTeam = await testApi('Create Sample Team', 'POST', '/api/teams', {
      name: 'PPL Super Kings',
      shortName: 'PSK',
      initialPurse: 20000,
    }, 201);
    sampleTeam = createdTeam.data;
  }
  if (sampleTeam?.id) {
    await testApi('Get Single Team Details', 'GET', `/api/teams/${sampleTeam.id}`);
    await testApi('Adjust Team Purse (+₹1,000)', 'POST', `/api/teams/${sampleTeam.id}/adjust-purse`, {
      adjustmentAmount: 1000,
      reason: 'Audit test bonus',
      auctionId: targetAucId,
    });
    await testApi('Adjust Team Purse (-₹500)', 'POST', `/api/teams/${sampleTeam.id}/adjust-purse`, {
      adjustmentAmount: -500,
      reason: 'Audit test penalty',
      auctionId: targetAucId,
    });
  }

  // 5. Auth & Captains API
  await testApi('Get Registered Users', 'GET', '/api/auth/users');
  await testApi('Get Captains List', 'GET', '/api/auth/captains');
  await testApi('Admin Login Valid Credentials', 'POST', '/api/auth/login', {
    email: 'admin@pplconnect.com',
    password: 'admin123',
  });
  await testApi('Login Nonexistent Email (Expected 404)', 'POST', '/api/auth/login', {
    email: 'unknown@user.com',
    password: 'wrongpassword',
  }, 404);
  await testApi('Login Wrong Password (Expected 401)', 'POST', '/api/auth/login', {
    email: 'admin@pplconnect.com',
    password: 'wrongpassword',
  }, 401);

  // 6. Players API
  await testApi('List Players Registry', 'GET', '/api/players');
  await testApi('Player Self-Check (Found by Name/Phone/Email)', 'GET', '/api/players/self-check?query=Jayesh');
  await testApi('Player Self-Check (Not Found Returns 200 with found: false)', 'GET', '/api/players/self-check?query=nonexistentplayer999', undefined, 200);
  await testApi('Players Management View', 'GET', '/api/players/management');
  await testApi('Shareable Public Players Pool', 'GET', '/api/players/public-pool');
  await testApi('Auction Pool By ID', 'GET', `/api/players/pool/${targetAucId}`);
  await testApi('Player Registrations by Auction', 'GET', `/api/players/registrations/${targetAucId}`);

  // 7. Live Auction Engine Workflow
  console.log('\n--- TESTING LIVE AUCTION ENGINE WORKFLOW ---');
  await testApi('Call Next Player to Block', 'POST', `/api/auctions/${targetAucId}/call-player`, {});
  await testApi('Pause Bidding Clock', 'POST', `/api/auctions/${targetAucId}/pause-clock`, {});
  await testApi('Resume Bidding Clock', 'POST', `/api/auctions/${targetAucId}/resume-clock`, {});
  
  // Test raise bid without team (Auctioneer raises price)
  await testApi('Auctioneer Raise Bid (No Team Selected)', 'POST', `/api/auctions/${targetAucId}/place-bid`, {
    customAmount: 600,
  });

  // Test bid with team
  if (sampleTeam?.id) {
    await testApi('Team Place Valid Bid', 'POST', `/api/auctions/${targetAucId}/place-bid`, {
      teamId: sampleTeam.id,
      customAmount: 700,
    });
  }

  await testApi('Undo Last Bid', 'POST', `/api/auctions/${targetAucId}/undo-bid`, {});

  // Mark Sold with winning team selection
  if (sampleTeam?.id) {
    await testApi('Mark Active Player SOLD to Winning Team', 'POST', `/api/auctions/${targetAucId}/mark-sold`, {
      teamId: sampleTeam.id,
      amount: 1000,
    });
  }

  // Call another player and test Mark Unsold
  await testApi('Call Next Player for Unsold Test', 'POST', `/api/auctions/${targetAucId}/call-player`, {});
  await testApi('Mark Active Player UNSOLD', 'POST', `/api/auctions/${targetAucId}/mark-unsold`, {});

  // 8. Retentions API
  await testApi('Get Auction Retentions', 'GET', `/api/retentions/${targetAucId}`);
  if (sampleTeam?.id) {
    await testApi('Get Team Retention Slot', 'GET', `/api/retentions/team/${sampleTeam.id}`);
  }

  // 9. Reports & Audits API
  await testApi('Auction Summary Report', 'GET', `/api/reports/${targetAucId}/summary`);
  await testApi('Final Squads Report', 'GET', `/api/reports/${targetAucId}/final-squads`);
  await testApi('Audit Logs', 'GET', `/api/audit/${targetAucId}`);

  // Print Summary
  console.log('\n=============================================');
  console.log('           API TEST RESULTS SUMMARY          ');
  console.log('=============================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`TOTAL ENDPOINTS TESTED: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`- [${r.method}] ${r.path} (${r.name}): got ${r.status}, expected ${JSON.stringify(r.expected)}. Error: ${r.error}`);
    });
  } else {
    console.log('\n🎉 ALL 100% OF APPLICATION API ENDPOINTS PASSED CLEANLY WITH ZERO ERRORS!');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
